# Apple Foundation Models bridge

macOSの [Foundation Models framework](https://developer.apple.com/documentation/foundationmodels) を
OpenAI互換APIとしてローカル公開する小さなSwiftブリッジです。

Foundation ModelsはSwiftからのみ呼び出せるため、ブラウザやElectronのNode直接从では利用できません。
このブリッジを `127.0.0.1` に立てると、Right-Stuff Editor Dash の既存OpenAI互換ストリーミング実装をそのまま利用できます。

## 必要条件

- macOS 26 以降
- Apple Silicon（M系）
- Apple Intelligence が有効（設定 > Apple Intelligence）
- FoundationModels.framework を含むSDK（Xcode 26 / Command Line Tools）

## 使い方

```bash
npm run applefm        # ビルドして起動
npm run applefm:build  # ビルドのみ
```

ポート変更:

```bash
./applefm/build/apple-fm-server --port 9000
APPLEFM_PORT=9000 npm run applefm
```

## エンドポイント

| メソッド | パス | 説明 |
| --- | --- | --- |
| GET | `/health` | モデルの利用可否（`available`, `reason`, `detail`）。不可時は 503 |
| GET | `/v1/models` | `apple-foundation-model` を返す（不可時は空配列） |
| POST | `/v1/chat/completions` | OpenAI互換。`stream: true` でSSE（`data: {...}` / `data: [DONE]`） |
| OPTIONS | すべて | CORS preflight（`Access-Control-Allow-Origin: *`） |

`/chat/completions`（`/v1` なし）も受け付けます。`content` は文字列と
OpenAI形式のparts配列（`[{"type":"text","text":"..."}]`）の両方に対応します。

## 制限事項

- `127.0.0.1` のみにバインドします（外部には公開しません）。
- 複数クライアントからの同時リクエストは、内容の生成中にリクエストがシリアライズされます。
- コンテキストウィンドウが小さいため、プロンプトは最新12,000文字に切り詰め、
  `max_tokens` は最大2,048トークンにクランプされます。
- `system` メッセージはセッションの指示（instructions）として扱われます。
  残りのメッセージは `User:` / `Assistant:` のラベル付き会話として1つのプロンプトに変換します。
- 使用量（`usage`）は常に0です（オンデバイスAPIから取得できないため）。
