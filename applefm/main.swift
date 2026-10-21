import Foundation
import Network

#if canImport(FoundationModels)
import FoundationModels
#endif

// MARK: - Configuration

let defaultPort: UInt16 = 8765
let modelIdentifier = "apple-foundation-model"
let host = "127.0.0.1"

let args = CommandLine.arguments
let portIndex = args.firstIndex(of: "--port")
let resolvedPort: UInt16 = {
    if let portIndex, portIndex + 1 < args.count, let parsed = UInt16(args[portIndex + 1]) {
        return parsed
    }
    if let env = ProcessInfo.processInfo.environment["APPLEFM_PORT"], let parsed = UInt16(env) {
        return parsed
    }
    return defaultPort
}()

let isoFormatter: ISO8601DateFormatter = {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime]
    return formatter
}()

func logLine(_ message: String) {
    let line = "[\(isoFormatter.string(from: Date()))] \(message)\n"
    FileHandle.standardError.write(Data(line.utf8))
}

// MARK: - Wire format

struct ChatMessage: Decodable {
    let role: String
    let content: String

    struct Part: Decodable {
        let type: String?
        let text: String?
    }

    enum CodingKeys: String, CodingKey {
        case role
        case content
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        role = (try? container.decode(String.self, forKey: .role)) ?? "user"
        if let plain = try? container.decode(String.self, forKey: .content) {
            content = plain
            return
        }
        if let parts = try? container.decode([Part].self, forKey: .content) {
            content = parts.compactMap(\.text).joined(separator: "\n")
            return
        }
        content = ""
    }
}

struct ChatRequest: Decodable {
    let messages: [ChatMessage]
    let temperature: Double?
    let maxTokens: Int?
    let stream: Bool?

    enum CodingKeys: String, CodingKey {
        case messages
        case temperature
        case stream
        case maxTokens = "max_tokens"
    }
}

struct ErrorPayload: Encodable {
    struct Body: Encodable {
        let message: String
        let type: String
        let code: String?
    }
    let error: Body
}

func errorResponse(_ message: String, type: String = "invalid_request_error", code: String? = nil) -> Data {
    (try? JSONEncoder().encode(ErrorPayload(error: .init(message: message, type: type, code: code))))
        ?? Data(#"{"error":{"message":"unknown error","type":"server_error"}}"#.utf8)
}

func makeChunk(model: String, content: String?, finishReason: String?) -> Data {
    struct Delta: Encodable {
        let content: String?
    }
    struct Choice: Encodable {
        let index: Int
        let delta: Delta
        let finish_reason: String?
    }
    struct Chunk: Encodable {
        let id: String
        let object: String
        let created: Int
        let model: String
        let choices: [Choice]
    }
    let chunk = Chunk(
        id: "chatcmpl-applefm",
        object: "chat.completion.chunk",
        created: Int(Date().timeIntervalSince1970),
        model: model,
        choices: [Choice(index: 0, delta: Delta(content: content), finish_reason: finishReason)]
    )
    guard let encoded = try? JSONEncoder().encode(chunk) else {
        return Data("data: {}\n\n".utf8)
    }
    return Data("data: ".utf8) + encoded + Data("\n\n".utf8)
}

// MARK: - Model availability

struct AvailabilityInfo {
    let available: Bool
    let reason: String?
    let detail: String?
}

func availabilityInfo() -> AvailabilityInfo {
    #if canImport(FoundationModels)
    if #available(macOS 26.0, *) {
        switch SystemLanguageModel.default.availability {
        case .available:
            return AvailabilityInfo(available: true, reason: nil, detail: nil)
        case .unavailable(let reason):
            let name = String(describing: reason)
            let detail: String
            switch reason {
            case .deviceNotEligible:
                detail = "このデバイスは Apple Intelligence に対応していません（Apple Silicon が必要です）。"
            case .appleIntelligenceNotEnabled:
                detail = "Apple Intelligence が有効になっていません。設定 > Apple Intelligence で有効にしてください。"
            case .modelNotReady:
                detail = "オンデバイスモデルの準備ができていません。Apple Intelligence の設定でダウンロードを完了してください。"
            @unknown default:
                detail = "モデルを利用できません（\(name)）。"
            }
            return AvailabilityInfo(available: false, reason: name, detail: detail)
        @unknown default:
            return AvailabilityInfo(available: false, reason: "unknown", detail: "モデル状態を確認できません。")
        }
    }
    #endif
    return AvailabilityInfo(
        available: false,
        reason: "unsupportedOS",
        detail: "Apple Foundation Models には macOS 26 以降が必要です。"
    )
}

// MARK: - Prompt construction

private func buildInstructions(from messages: [ChatMessage]) -> String? {
    let system = messages
        .filter { $0.role == "system" }
        .map(\.content)
        .filter { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
    guard !system.isEmpty else { return nil }
    return system.joined(separator: "\n\n")
}

private func buildPrompt(from messages: [ChatMessage]) -> String {
    let conversational = messages.filter { $0.role != "system" }
    guard !conversational.isEmpty else { return "" }

    var sections = conversational.map {
        "\($0.role == "assistant" ? "Assistant" : "User"): \($0.content)"
    }

    // The on-device model has a small context window; keep the newest turns.
    let maxCharacters = 12_000
    var total = sections.reduce(0) { $0 + $1.count + 2 }
    while total > maxCharacters && sections.count > 1 {
        total -= sections.removeFirst().count + 2
    }

    return sections.joined(separator: "\n\n")
}

// MARK: - Generation

enum GenerationFailure: Error {
    case unavailable(String)
    case failed(String)
}

@available(macOS 26.0, *)
func generate(
    messages: [ChatMessage],
    temperature: Double?,
    maxTokens: Int?,
    onDelta: @escaping (String) -> Void
) async throws {
    let model = SystemLanguageModel.default
    if case .unavailable(let reason) = model.availability {
        throw GenerationFailure.unavailable(String(describing: reason))
    }

    var options = GenerationOptions()
    if let temperature, temperature >= 0 {
        options.temperature = min(temperature, 2.0)
    }
    if let maxTokens, maxTokens > 0 {
        options.maximumResponseTokens = min(maxTokens, 2048)
    }

    let session = LanguageModelSession(model: model, instructions: buildInstructions(from: messages))
    let prompt = buildPrompt(from: messages)
    let stream = session.streamResponse(to: prompt, options: options)

    var previous = ""
    do {
        for try await snapshot in stream {
            let full = snapshot.content
            if full.count > previous.count {
                onDelta(String(full.dropFirst(previous.count)))
                previous = full
            }
        }
    } catch {
        throw GenerationFailure.failed(describe(error))
    }
}

private func describe(_ error: Error) -> String {
    if let localized = error as? LocalizedError, let description = localized.errorDescription {
        return description
    }
    return String(describing: error)
}

// MARK: - HTTP plumbing

struct HTTPRequest {
    let method: String
    let path: String
    let headers: [String: String]
    let body: Data
}

func buildResponse(
    status: String,
    contentType: String,
    body: Data,
    extraHeaders: [String: String] = [:],
    includeContentLength: Bool = true
) -> Data {
    var head = "HTTP/1.1 \(status)\r\n"
    head += "Content-Type: \(contentType)\r\n"
    if includeContentLength {
        head += "Content-Length: \(body.count)\r\n"
    }
    head += "Access-Control-Allow-Origin: *\r\n"
    head += "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n"
    head += "Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With\r\n"
    head += "Cache-Control: no-store\r\n"
    head += "Connection: close\r\n"
    for (key, value) in extraHeaders {
        head += "\(key): \(value)\r\n"
    }
    head += "\r\n"
    var data = Data(head.utf8)
    data.append(body)
    return data
}

final class StreamWriter {
    private let connection: NWConnection
    private let lock = NSLock()
    private var pending: [Data] = []
    private var draining = false
    private var finished = false
    private var onFinish: (() -> Void)?

    init(connection: NWConnection) {
        self.connection = connection
    }

    func setOnFinish(_ callback: @escaping () -> Void) {
        lock.lock()
        onFinish = callback
        lock.unlock()
    }

    func write(_ data: Data) {
        lock.lock()
        guard !finished else {
            lock.unlock()
            return
        }
        pending.append(data)
        lock.unlock()
        drain()
    }

    func finish() {
        lock.lock()
        guard !finished else {
            lock.unlock()
            return
        }
        finished = true
        lock.unlock()
        drain()
    }

    /// Cancels the pending queue (client disconnected) and releases resources.
    func abort() {
        lock.lock()
        pending.removeAll()
        finished = true
        let callback = onFinish
        onFinish = nil
        lock.unlock()
        callback?()
    }

    private func drain() {
        lock.lock()
        guard !draining, !pending.isEmpty || finished else {
            lock.unlock()
            return
        }
        draining = true
        guard !pending.isEmpty else {
            draining = false
            let callback = finished ? onFinish : nil
            if finished { onFinish = nil }
            lock.unlock()
            callback?()
            return
        }
        let chunk = pending.removeFirst()
        lock.unlock()

        // `self` is captured strongly so the writer outlives an in-flight send.
        connection.send(content: chunk, completion: .contentProcessed { error in
            self.lock.lock()
            self.draining = false
            let failed = error != nil
            if failed {
                self.pending.removeAll()
                self.finished = true
                self.onFinish = nil
            }
            self.lock.unlock()
            if failed { return }
            self.drain()
        })
    }
}

/// Owns one streaming response: keeps the writer alive, cancels generation when
/// the client goes away, and closes the connection exactly once.
final class StreamSession {
    private static let registryLock = NSLock()
    private static var registry: [ObjectIdentifier: StreamSession] = [:]

    private let connection: NWConnection
    private let writer: StreamWriter
    private let lock = NSLock()
    private var task: Task<Void, Never>?
    private var closed = false

    init(connection: NWConnection) {
        self.connection = connection
        self.writer = StreamWriter(connection: connection)
        writer.setOnFinish { [weak self] in
            self?.close()
        }
        Self.register(self)
    }

    private static func register(_ session: StreamSession) {
        registryLock.lock()
        registry[ObjectIdentifier(session.connection)] = session
        registryLock.unlock()
    }

    /// Called when the peer closes the socket: stops an in-flight generation.
    static func closeSession(for connection: NWConnection) {
        registryLock.lock()
        let session = registry[ObjectIdentifier(connection)]
        registryLock.unlock()
        session?.close()
    }

    func start(_ operation: @escaping (StreamWriter) async -> Void) {
        let writer = self.writer
        let task = Task { [weak self] in
            await operation(writer)
            guard let self else { return }
            writer.finish()
            self.releaseTask()
        }
        lock.lock()
        self.task = task
        let alreadyClosed = closed
        lock.unlock()
        if alreadyClosed {
            task.cancel()
        }
    }

    func close() {
        lock.lock()
        guard !closed else {
            lock.unlock()
            return
        }
        closed = true
        let running = task
        task = nil
        lock.unlock()
        running?.cancel()
        Self.registryLock.lock()
        Self.registry.removeValue(forKey: ObjectIdentifier(connection))
        Self.registryLock.unlock()
        connection.cancel()
    }
    private func releaseTask() {
        lock.lock()
        task = nil
        lock.unlock()
    }

    deinit {
        task?.cancel()
    }
}

func sendJSON(_ connection: NWConnection, status: String, payload: some Encodable) {
    let encoder = JSONEncoder()
    encoder.outputFormatting = [.sortedKeys]
    let body = (try? encoder.encode(payload)) ?? Data("{}".utf8)
    let data = buildResponse(status: status, contentType: "application/json; charset=utf-8", body: body)
    connection.send(content: data, completion: .contentProcessed { _ in
        connection.cancel()
    })
}

func handle(_ request: HTTPRequest, on connection: NWConnection) {
    let path = request.path.split(separator: "?").first.map(String.init) ?? request.path

    if request.method == "OPTIONS" {
        let data = buildResponse(status: "204 No Content", contentType: "text/plain", body: Data())
        connection.send(content: data, completion: .contentProcessed { _ in connection.cancel() })
        return
    }

    if request.method == "GET" {
        if path.hasSuffix("/health") || path == "/" {
            let info = availabilityInfo()
            struct Payload: Encodable {
                let status: String
                let model: String
                let available: Bool
                let reason: String?
                let detail: String?
                let platform: String
                let osVersion: String
                let version: String
            }
            let payload = Payload(
                status: info.available ? "ok" : "unavailable",
                model: modelIdentifier,
                available: info.available,
                reason: info.reason,
                detail: info.detail,
                platform: "apple-foundation-models",
                osVersion: ProcessInfo.processInfo.operatingSystemVersionString,
                version: "1.0.0"
            )
            let status = info.available ? "200 OK" : "503 Service Unavailable"
            sendJSON(connection, status: status, payload: payload)
            return
        }

        if path.hasSuffix("/models") {
            struct Model: Encodable {
                let id: String
                let object: String
                let owned_by: String
            }
            struct Payload: Encodable {
                let object: String
                let data: [Model]
            }
            let info = availabilityInfo()
            let payload = Payload(
                object: "list",
                data: info.available
                    ? [Model(id: modelIdentifier, object: "model", owned_by: "apple")]
                    : []
            )
            sendJSON(connection, status: "200 OK", payload: payload)
            return
        }

        sendJSON(connection, status: "404 Not Found", payload: ErrorPayload(error: .init(message: "unknown endpoint: \(path)", type: "invalid_request_error", code: nil)))
        return
    }

    guard request.method == "POST", path.hasSuffix("/chat/completions") else {
        sendJSON(connection, status: "404 Not Found", payload: ErrorPayload(error: .init(message: "unknown endpoint: \(path)", type: "invalid_request_error", code: nil)))
        return
    }

    guard let chatRequest = try? JSONDecoder().decode(ChatRequest.self, from: request.body) else {
        sendJSON(connection, status: "400 Bad Request", payload: ErrorPayload(error: .init(message: "invalid JSON body", type: "invalid_request_error", code: nil)))
        return
    }

    let info = availabilityInfo()
    guard info.available else {
        let message = info.detail ?? "Apple Foundation Models is not available."
        logLine("request rejected: \(info.reason ?? "unknown")")
        sendJSON(connection, status: "503 Service Unavailable", payload: ErrorPayload(error: .init(message: message, type: "server_error", code: info.reason)))
        return
    }

    let model = modelIdentifier
    let temperature = chatRequest.temperature
    let maxTokens = chatRequest.maxTokens
    let messages = chatRequest.messages
    let wantsStream = chatRequest.stream ?? false

    if wantsStream {
        let head = buildResponse(
            status: "200 OK",
            contentType: "text/event-stream; charset=utf-8",
            body: Data(),
            extraHeaders: ["X-Accel-Buffering": "no"],
            includeContentLength: false
        )
        let session = StreamSession(connection: connection)
        connection.send(content: head, completion: .contentProcessed { error in
            guard error == nil else {
                session.close()
                return
            }
            session.start { writer in
                if #available(macOS 26.0, *) {
                    do {
                        try await generate(
                            messages: messages,
                            temperature: temperature,
                            maxTokens: maxTokens
                        ) { delta in
                            writer.write(makeChunk(model: model, content: delta, finishReason: nil))
                        }
                        writer.write(makeChunk(model: model, content: nil, finishReason: "stop"))
                        writer.write(Data("data: [DONE]\n\n".utf8))
                    } catch {
                        let text: String
                        if let failure = error as? GenerationFailure {
                            switch failure {
                            case .unavailable(let reason):
                                text = "Apple Foundation Models is unavailable: \(reason)"
                            case .failed(let message):
                                text = message
                            }
                        } else {
                            text = describe(error)
                        }
                        logLine("generation error: \(text)")
                        writer.write(Data("data: ".utf8) + errorResponse(text) + Data("\n\n".utf8))
                        writer.write(Data("data: [DONE]\n\n".utf8))
                    }
                } else {
                    writer.write(Data("data: ".utf8) + errorResponse("macOS 26 or later is required.") + Data("\n\n".utf8))
                    writer.write(Data("data: [DONE]\n\n".utf8))
                }
            }
        })
        return
    }

    Task {
        var text = ""
        if #available(macOS 26.0, *) {
            do {
                try await generate(
                    messages: messages,
                    temperature: temperature,
                    maxTokens: maxTokens
                ) { delta in
                    text += delta
                }
            } catch let failure as GenerationFailure {
                let detail: String
                switch failure {
                case .unavailable(let reason):
                    detail = reason
                case .failed(let message):
                    detail = message
                    logLine("generation error: \(message)")
                }
                sendJSON(connection, status: "500 Internal Server Error", payload: ErrorPayload(error: .init(message: detail, type: "server_error", code: nil)))
                return
            } catch {
                logLine("generation error: \(describe(error))")
                sendJSON(connection, status: "500 Internal Server Error", payload: ErrorPayload(error: .init(message: describe(error), type: "server_error", code: nil)))
                return
            }
        }

        struct Usage: Encodable {
            let prompt_tokens: Int
            let completion_tokens: Int
            let total_tokens: Int
        }
        struct Choice: Encodable {
            let index: Int
            let message: ChatMessageOut
            let finish_reason: String
        }
        struct ChatMessageOut: Encodable {
            let role: String
            let content: String
        }
        struct Payload: Encodable {
            let id: String
            let object: String
            let created: Int
            let model: String
            let choices: [Choice]
            let usage: Usage
        }
        let payload = Payload(
            id: "chatcmpl-applefm",
            object: "chat.completion",
            created: Int(Date().timeIntervalSince1970),
            model: model,
            choices: [Choice(index: 0, message: ChatMessageOut(role: "assistant", content: text), finish_reason: "stop")],
            usage: Usage(prompt_tokens: 0, completion_tokens: 0, total_tokens: 0)
        )
        sendJSON(connection, status: "200 OK", payload: payload)
    }
}

// MARK: - Listener

func start() throws {
    let listener: NWListener
    do {
        listener = try NWListener(using: .tcp, on: NWEndpoint.Port(rawValue: resolvedPort) ?? .init(rawValue: defaultPort)!)
    } catch {
        logLine("failed to bind port \(resolvedPort): \(describe(error))")
        exit(1)
    }

    let info = availabilityInfo()
    listener.newConnectionHandler = { connection in
        connection.stateUpdateHandler = { state in
            if case .failed(let error) = state {
                logLine("connection failed: \(describe(error))")
            }
        }
        connection.start(queue: .global(qos: .userInitiated))

        var buffer = Data()

        func drainBuffer(on connection: NWConnection) {
            while true {
                guard let headerRange = buffer.range(of: Data("\r\n\r\n".utf8)) else { return }
                let headerEndIndex = buffer.index(headerRange.lowerBound, offsetBy: -buffer.startIndex)
                let bodyStartIndex = buffer.index(headerRange.upperBound, offsetBy: -buffer.startIndex)

                let headerText = String(decoding: buffer[buffer.startIndex..<headerEndIndex], as: UTF8.self)
                var lines = headerText.components(separatedBy: "\r\n")
                guard !lines.isEmpty else {
                    connection.cancel()
                    return
                }
                let requestLine = lines.removeFirst().split(separator: " ", omittingEmptySubsequences: true)
                guard requestLine.count >= 2 else {
                    connection.cancel()
                    return
                }
                let method = String(requestLine[0])
                let target = String(requestLine[1])
                var headers: [String: String] = [:]
                for line in lines {
                    guard let colon = line.firstIndex(of: ":") else { continue }
                    let key = line[line.startIndex..<colon]
                        .trimmingCharacters(in: .whitespaces)
                        .lowercased()
                    let value = line[line.index(after: colon)...]
                        .trimmingCharacters(in: .whitespaces)
                    headers[key] = value
                }

                let contentLength = Int(headers["content-length"] ?? "0") ?? 0
                guard buffer.count - bodyStartIndex >= contentLength else { return }
                let bodyEndIndex = buffer.index(bodyStartIndex, offsetBy: contentLength)
                let body = Data(buffer[bodyStartIndex..<bodyEndIndex])
                buffer = Data(buffer[bodyEndIndex...])

                handle(HTTPRequest(method: method, path: target, headers: headers, body: body), on: connection)
            }
        }

        func receiveMore() {
            connection.receive(minimumIncompleteLength: 1, maximumLength: 256 * 1024) { chunk, _, isComplete, error in
                if let chunk, !chunk.isEmpty {
                    buffer.append(chunk)
                    drainBuffer(on: connection)
                }
                if isComplete || error != nil {
                    StreamSession.closeSession(for: connection)
                    connection.cancel()
                    return
                }
                receiveMore()
            }
        }

        receiveMore()
    }

    listener.stateUpdateHandler = { state in
        switch state {
        case .ready:
            logLine("Apple Foundation Models bridge listening on http://\(host):\(resolvedPort)")
            logLine("model: \(modelIdentifier) (available: \(info.available))")
            if !info.available, let detail = info.detail {
                logLine("note: \(detail)")
            }
        case .failed(let error):
            logLine("listener failed: \(describe(error))")
            exit(1)
        case .cancelled:
            break
        default:
            break
        }
    }

    listener.start(queue: .global(qos: .userInitiated))
    dispatchMain()
}

do {
    try start()
} catch {
    logLine("fatal: \(describe(error))")
    exit(1)
}
