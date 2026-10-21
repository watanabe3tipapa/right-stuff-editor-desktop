
 # Right-Stuff-Editor History

## Living Document - 変更履歴

このファイルはプロジェクトの進化を時系列で記録するLiving Documentです。

---

## 2026-09-26 - v0.4.3: アプリ内ターミナル（wterm + node-pty）

### 主な変更

- **アプリ内ターミナルの実装**: Electron版に、編集画面内で実際のOSシェルを操作できるターミナルを追加しました。従来のモック表示（入力しても何も起きない）を、`node-pty` でプロセスを起動し `wterm`（WASM 製 xterm 系）で描画する実装に置き換えています。
- **`@wterm/react` / `@wterm/dom` の導入**: 描画ライブラリを wterm 系に変更。`public/wterm.wasm` を同梱し、Vite の assets として配布します。
- **`node-pty` の導入**: メインプロセスで PTY を生成。シェルは `process.env.SHELL`（未設定時は `/bin/bash`）を使い、`TERM=xterm-256color`、初期サイズは 80x24 を基準に範囲を制限します。
- **作業ディレクトリの自動選択**: 開いているファイルがあればそのファイルのディレクトリ、なければホームディレクトリでシェルを起動します。起動後に `cd` で移動した後もそのまま維持されます。
- **IPC の設計**: `pty:start` / `pty:write` / `pty:resize` / `pty:stop` のコマンドと、`pty:data` / `pty:exit` のイベントを `contextIsolation` 前提で `preload` 経由に公開。renderer 側からは型付き API として扱えます。
- **起動直後の出力の取りこぼし防止**: wterm の初期化が非同期なため、`onReady` より前に届いた PTY 出力をバッファして `onReady` 後にフラッシュします。プロンプトが取りこぼされないことをテストで確認しました。
- **React 18 対応**: `@wterm/react` は v0.1.x の時点で callback ref に cleanup 関数を返す実装をしており、React 18 ではその cleanup が呼ばれません。`WTerm` の `destroy()` を ref 設定後に明示的に呼ぶことで、ターミナルを閉じる際に PTY と WASM を確実に破棄するようにしました。
- **パネル幅に追従するリサイズ**: 標準の `autoResize` ではなくコンテナの `ResizeObserver` で PTY の `cols` を更新し、wterm 側のレイアウトと PTY の桁数を同期しています。描画のガタつきがありません。
- **ブラウザ版はフォールバック**: Web版には PTY がないため、既存のモックターミナル（入力内容を反表示するだけ）のまま動作します。ブラウザ版・Electron版で同じ UI を提供し、シェルを起動できない環境では自動的にモックへ切り替わります。

### リリース

- バージョン表記を **v0.4.3** に更新（`package.json` / `package-lock.json` / フッター / ターミナル / ヘルプ / ランディングページ / `README.md` / `README_ja.md`）。
- `electron/main.js` / `electron/main.cjs` / `electron/preload.js` / `electron/preload.cjs` を再生成して同梱。

### 不具合の修正

- `getActiveFileInfo()` の未定義参照を修正。ファイル未オープン時に `undefined` が作業ディレクトリの計算へ渡るケースを解消しました。
- コメント内の全角カンマ（U+FF0C）混在を修正。

### 検証

- Electron E2E: 26/26 passed。PTY 起動、DOM レンダリング（`.wterm` 配下の `.term-grid` と `.term-row`、隠し `textarea`）、行数の生成、コンテナの `clientHeight` を占有していること、画面への入力エコー、制御文字と改行の送出、`pwd` による作業ディレクトリ確認、パネル幅変更に応じた PTY 列数の変化、リサイズ後もシェルが継続していること、閉じる操作、開き直し、`exit` イベント、ターミナル関連例外なし（console 監視）を確認しました。
- ブラウザ版フォールバック: 7/7 passed（`electronAPI` が無い環境でモックターミナルが描画され、入力が反表示されること）。
- `npx tsc --noEmit` / `npx tsc -p tsconfig.electron.json --noEmit` / `npm run build` / `npm run build:electron` 成功。

### 環境メモ

- `node-pty` はネイティブモジュールです。macOS では `node_modules/node-pty/prebuilds/darwin-arm64/spawn-helper` に実行権限（`chmod +x`）が必要です。権限が無い場合は `posix_spawnp failed` でシェルの起動に失敗します。
- `node-pty` は Node.js の ABI に依存するため、Electron 上で動かす場合は Electron 用のリビルドが必要になる場合があります。配布時はアーキテクチャと Node/Electron のバージョン組み合わせを必ず確認してください。
- 依存のダウンロードを遮断した環境では `node-pty` のインストールスクリプトが実行されず、PTY が動作しないことがあります（本リポジトリの検証環境では `spawn-helper` の権限を明示的に付与して解決）。

## 2026-09-26 - v0.4.2: チャットの文脈対応・Markdown表示・再読込バグ修正

### 主な変更

- **文書コンテキストの実装**: チャットが「現在の文書」を渡していなかったため、プロンプトテンプレートの「Summarize」「Continue」「Improve」「Examples」が機能していなかった問題を修正。`system` メッセージとして編集中のMarkdown（最大6,000文字）を添付。
- **トグルと字数表示**: チャット入力欄に「現在の文書を含める」トグルと文字数表示を追加。6,000文字超過時は先頭のみを送信し、末尾に省略注記を付与。状態は永続化。
- **System Prompt の設定**: Settingsに「System Prompt」欄を追加。入力内容はブラウザに永続化され、送信時に `system` メッセージの先頭に付与。
- **チャット応答のMarkdown表示**: AIの応答がプレーンテキスト（`<pre>`）のまま表示されていた問題を修正。見出し・箇条書き・表・引用・太字・斜体・リンク・画像とシンタックスハイライト付きコードブロックを、プレビューと同じパイプライン（remark + rehype-sanitize + highlight）で描画。生のHTMLやスクリプトはサニタイズしてから反映。
- **Apple FM の実機検証**: Electron を `--remote-debugging-port` で起動し、CDPで実際のボタン操作を自動検証（11/11 passed）。サーバー起動 → `/health` 可用 → UI に「✓ Running」とPID表示 → RendererからSSE完走 → 停止 → ポート解放まで確認。
- **PID表示の追加**: Electron版で「サーバー起動」した後のプロセスIDをSettingsに表示するようにしました（起動し忘れたプロセスの特定に便利）。

### リリース

- バージョン表記を **v0.4.2** に更新（`package.json` / `package-lock.json` / フッター / ターミナル / ヘルプ / ランディングページ / `README.md` / `README_ja.md`）。

### 不具合の修正

- **チャット履歴があると再読込で画面が真っ白になる問題**: チャットメッセージを localStorage に保存すると日付が文字列として復元されるにもかかわらず、描画時に `Date` のメソッドを直接呼んでいたため（`message.timestamp.toLocaleTimeString()`）、再読込直後に `TypeError` が発生し、React がツリーごと破棄していました。復元時に日付を `Date` へ戻す処理を追加して解消。あわせて復元直後に選択中セッションの本文を読み戻すようになり、リロードしても会話を継続できるようになりました。
- Settingsの案内文「OpenAI 互換APIでbridgeします」の英日混在表現を「OpenAI 互換APIとして公開します」に修正。
- USAGE.md に混入していた文字化け表現（「文字数がウン，表示されます」など）を修正。

### 検証

- ブラウザ版での Apple FM ストリーミング（Google Chrome + CDP、Electron ではなく実ブラウザ）: 19/19 passed。CORS 経由の `/health`・`/v1/models`・OPTIONS プリフライト(204)、`fetch` + ReadableStream でのストリーミング、UI からの実送信と Markdown 描画まで確認。ブラウザ版では「サーバー起動」ボタンが出ず `npm run applefm` の案内が出ることも確認。
- チャット応答のMarkdown表示: 実ストリーミングで15/15 passed（見出し・箇条書き・太字・コードブロックがそれぞれ対応要素として描画され、シンタックスハイライトが適用されること、Markdown記法（`#` / `**` / ```）が本文に残らないこと、script / onerror / javascript: URL が除去されること、ユーザーメッセージはプレーンテキストのままであること）。
- チャット履歴の復元: 5/5 passed（再読込前と再読込後で同じ会話が復元され、画面がクラッシュしないこと）。
- 文書コンテキスト/System Prompt: 8/8 passed、Apple FM: 11/11 passed。
- `npx tsc --noEmit` / `npm run build` / `npm run build:electron` 成功。

### 環境メモ

- インストールスクリプトを遮断した環境では `npm ci` 後に Electron のバイナリが未展開のままになり得ます（`extract-zip` が途中で失敗）。macOSではキャッシュされた zip を `ditto -x -k` で展開し、`node_modules/electron/path.txt` に `Electron.app/Contents/MacOS/Electron` を書き戻すと復旧します。

## 2026-09-26 - v0.4.1: Apple Foundation Models 対応（Apple FM プロバイダー）

### 主な変更

- **Apple FM プロバイダー追加**: macOS内蔵のオンデバイスモデル（Apple Intelligence）に接続可能に。APIキー不要・端末内で推論。
- **Swiftブリッジの同梱**: `FoundationModels` はSwiftからのみ呼び出せるため、`packages/editor/applefm` にOpenAI互換APIを公開するSwiftブリッジを追加。`/v1/chat/completions`（SSE対応）・`/v1/models`・`/health` を `127.0.0.1:8765` で提供。
- **Settings の Apple FM セクション**: 状態確認（`available` / `appleIntelligenceNotEnabled` / `modelNotReady` / `deviceNotEligible`）と、Electron版のサーバー起動・停止ボタンを追加。
- **Electron IPC**: `applefm:start` / `applefm:stop` を追加。`will-quit` でブリッジを自動停止。
- **SSE読み取りの修正**: `sendChatRequest` でストリーム終了時に残バッファが捨てられる不具合と、`[DONE]` 後の読み取りが残る問題を修正。エラー時はサーバーの `error.message` をそのまま表示。
- **npmスクリプト**: `npm run applefm`（ビルド＋起動）/ `npm run applefm:build`（ビルドのみ）を追加。
- **エラー表示**: チャットでLLM接続に失敗した場合、サーバーのメッセージを画面上に表示。応答が空のまま失敗した場合はアシスタントの吹き出しに文言を表示。
- **バージョン**: v0.4.0 → **v0.4.1**（package.json / package-lock.json / フッター / ターミナル / ヘルプ / ランディングページ）。
- **ドキュメントの整備**: `README_ja.md` にv0.4.1の索引を追加。`USAGE.md` / `DEV-MEMO.md` の既存セクションに残る中国語・韓国語由来の文字を修正（`панеля` → `パネル`、`독립적으로` → `独立して`、`复杂で…难しいため` → `複雑で…難しかったため`、`계속사용` → `引き続き使用`）。

### 新規ファイル

| ファイル | 機能 |
|----------|------|
| `applefm/main.swift` | FoundationModels + NWListener によるOpenAI互換HTTP/SSEサーバー |
| `applefm/build.sh` | `swiftc` によるビルドスクリプト（`apple-fm-server`） |
| `applefm/README.md` | 必要条件・エンドポイント・制限事項 |

### 変更ファイル

| ファイル | 変更内容 |
|----------|----------|
| `src/utils/llmClient.ts` | `applefm` プロバイダー追加、`/health` チェック、SSE読み取り修正、サーバーメッセージを引き継ぐエラー処理 |
| `src/stores/llmStore.ts` | 既定エンドポイント（`127.0.0.1:8765`）・モデル取得（`/v1/models`）の追加 |
| `src/components/Settings/Settings.tsx` | Apple FM の選択と状態パネルを追加 |
| `src/utils/fileOperations.ts` | `Window.electronAPI` に `startAppleFM` / `stopAppleFM` を追加 |
| `electron/main.ts` / `electron/preload.ts` | ブリッジの起動・停止 IPC を実装 |

### 検証

- `swiftc` ビルド成功、`npm run applefm:build` 成功
- `GET /health` → `available: true`、`GET /v1/models` → `apple-foundation-model`
- ストリーミング: コンテンツ → `finish_reason: "stop"` → `data: [DONE]` まで到達し、接続が正常終了
- 非ストリーミング、`content` のparts配列、404、不正JSON、CORS preflight（204）、クライアント切断時の生成キャンセルを確認
- `npx tsc --noEmit` / `npm run build` / `npm run build:electron` 成功

### 備考

- オンデバイスモデルのコンテキストは小さいため、プロンプトは最新12,000文字へ切り詰め、`max_tokens` は最大2,048にクランプ。Settingsでの推奨値は1024。
- ブリッジは `127.0.0.1` のみにバインド（外部公開なし）。

---

## 2026-09-11 - v0.4.0 リッチテキストを拡充・編集体験の強化

### 主な変更

- **編集ツールバー拡充**: 下線・打消し線・文字色・文字背景色（ハイライト）・フォントサイズ（12〜32px）、リンク・画像・表・水平線の挿入 UI、Undo/Redo を追加。
- **画像のドラッグ&ドロップ・貼り付け**: エディタへ画像をドラッグまたはクリップボードから貼り付けると、Data URL として文書内に埋め込み。非画像の貼り付けは通常の動作にフォールスルー。
- **文書管理の強化**: サイドバーにタイトル・本文の検索と更新日での並び替え、文書の複製機能を追加。更新日は「更新 YYYY/M/D」形式で明示。
- **ショートカット一覧（Ctrl+/）**: 全ショートカットをまとめたヘルプモーダルを `Ctrl+/` またはフッターの「?」から表示。About から GitHub リポジトリへの導線も追加。
- **モバイル対応**: ツールバーのボタンを 44px 以上のタッチターゲットに調整し、横幅が足りない場合は横スクロールで利用可能に。

### 新規ファイル

| ファイル | 機能 |
|----------|------|
| `src/components/Editor/ImageNode.tsx` | 画像を本文に埋め込む DecoratorNode（Markdown 往復対応） |
| `src/components/Help/HelpModal.tsx` | ショートカット一覧・About・ドキュメント導線 |

### 関連作業

- README / README_ja / USAGE / DEV-MEMO を更新、バージョンをv0.4.0に更新。
- プレビュー・水平線（`---`）・画像（`![alt](url)`）の Markdown 往復を維持。

---

## 2026-08-31 - v0.3.1 ローカルファイル連携・強化プレビュー・mdv・Unsloth対応

### 主な変更

- **ローカルファイル連携**: 開いたローカルファイルを編集し、同じファイルへ上書き保存できるようになった。フッターにファイル名を表示。未保存時の離脱確認（`beforeunload`）を追加。
- **プレビュー強化**: GitHub Alerts（`> [!NOTE]` 等5種）、Mermaid図表（テーマ連動）、シンタックスハイライト（rehype-highlight）をMarkdownプレビューに追加。
- **mdv連携**: Electron版でツールバーの「Open in mdv」からmdvを別窓で起動。IPC（`mdv:launch` / `mdv:close`）と `will-quit` でのプロセス終了を実装。
- **Unslothプロバイダー**: LLM連携にUnslothを追加。OpenAI互換API（既定 `127.0.0.1:8888`）へ接続し、`/v1/models` からモデル一覧を自動取得。
- **歯車アイコン修正**: 設定ボタンの歯車アイコンを塗りつぶし型に変更し、16pxでも綺麗に表示。

### 新規ファイル

| ファイル | 機能 |
|----------|------|
| `src/utils/mdvConnection.ts` | mdv起動・URL取得・エラー整形（Electron版） |

### 関連作業

- Mermaidを動的importで分割（本番ビルドで別チャンク化）。
- README / USAGE / DEV-MEMO を更新、バージョンをv0.3.1に更新。

---

## 2026-08-26 - v0.3.0 GitHub Gist 連携機能の追加

### 主な変更

- **GitHub Gist連携**: 文書をGitHub Gistにワンクリックでアップロードする機能を追加。
- **Gist認証**: Settings画面にGitHub Personal Access Token（PAT）認証セクションを追加。
- **Gist Viewer**: Gist一覧の閲覧・検索・フィルタリング・プレビュー・エディタへのインポート機能を追加。
- **ツールバー拡張**: Upload to GistボタンとMy Gistsボタンを追加。
- **フッター通知**: Gistアップロード成功時のトースト通知を追加。
- **公開ページ更新**: Landing PageにGist連携機能を追記、バージョンをv0.3.0に更新。

### 新規ファイル

| ファイル | 機能 |
|----------|------|
| `src/services/gistService.ts` | GitHub Gist API ラッパー |
| `src/stores/gistStore.ts` | Gist 状態管理（Zustand + persist） |
| `src/components/Gist/GistUploadModal.tsx` | Gist アップロードモーダル |
| `src/components/Gist/GistViewer.tsx` | Gist 一覧モーダル |

### 維持した機能

- 既存のリッチテキスト・Markdown編集機能。
- AIチャットと各LLMプロバイダー設定。
- Agent Skill Manager（Electronでの利用）。
- Electron経由のローカルファイル・OSターミナル連携。

---

## 2026-08-22 - v0.2.3 編集・公開体験の改善

### 主な変更

- **公開導線**: 製品紹介ページを `/` に追加し、ライブデモを `/editor` へ分離。
- **編集の整合性**: Lexicalのリッチテキスト編集内容をMarkdownとして保存・プレビューし、文書切替時の読み込みを改善。
- **保存の信頼性**: 初期文書、IndexedDBからの復元、保存中・未保存・失敗表示、再試行導線を追加。
- **アクセシビリティ**: 初回ガイド、設定モーダルのEscape終了とフォーカス移動、操作ラベル、可視フォーカス、モーション低減設定を追加。
- **公開情報**: OGP画像、検索・SNS共有メタデータ、v0.2.3向けREADMEを追加・更新。

### 維持した機能

- AIチャットと各LLMプロバイダー設定。
- Agent Skill Manager（Electronでの利用）。
- Electron経由のローカルファイル・OSターミナル連携。

---

## 2026-04-07 - プロトタイプ 完成

### 新規作成機能

- **Webアプリケーション基盤**
  - React 18 + TypeScript + Vite セットアップ
  - Tailwind CSS スタイリング
  - Zustand 状態管理

- **エディター機能**
  - Lexical リッチテキストエディター
  - Markdown プレビュー
  - エディターモード切替（Rich Text / Markdown）

- **ファイルI/O機能**
  - Web File System API 対応
  - Electron IPC 対応コード追加
  - Fallback: 従来のfile input

- **LLM統合**
  - Ollama, AnythingLLM, OpenAI, Custom プロバイダー対応
  - ストリーミング応答対応
  - 設定UI（モデル選択、APIキー等）

- **自動保存**
  - Dexie.js (IndexedDB) による永続化
  - 30秒間隔の自動保存
  - ステータスバーに保存状況表示

- **テーマ切替**
  - Light / Dark / System オプション

- **キーボードショートカット**
  - Ctrl+S, Ctrl+B, Ctrl+Shift+C, Ctrl+Shift+M, Ctrl+N 等
  - カスタムショートカット対応

- **エクスポート機能**
  - Markdown 保存
  - HTML エクスポート
  - PDF エクスポート
  - JSON エクスポート

### 技術スタック

| レイヤー | 技術 |
|---------|------|
| フレームワーク | React 18.3.1 + TypeScript 5.4.5 |
| ビルドツール | Vite 5.4.2 |
| エディターコア | Lexical 0.17.1 |
| 状態管理 | Zustand 4.5.2 |
| ローカルDB | Dexie.js 4.0.4 |
| スタイリング | Tailwind CSS 3.4.4 |

### ファイル構成

```
packages/editor/
├── src/
│   ├── App.tsx
│   ├── components/
│   │   ├── Chat/ChatPanel.tsx
│   │   ├── Editor/LexicalEditor.tsx
│   │   ├── Preview/MarkdownPreview.tsx
│   │   ├── Settings/Settings.tsx
│   │   ├── Sidebar/Sidebar.tsx
│   │   └── Toolbar/Toolbar.tsx
│   ├── stores/
│   │   ├── chatStore.ts
│   │   ├── editorStore.ts
│   │   ├── llmStore.ts
│   │   ├── shortcutStore.ts
│   │   └── themeStore.ts
│   ├── utils/
│   │   ├── db.ts
│   │   ├── fileOperations.ts
│   │   ├── llmClient.ts
│   │   └── markdown.ts
│   └── types/index.ts
├── electron/
│   ├── main.ts
│   └── preload.ts
└── package.json
```

### 備考

- ステータスは「プロトタイプ（試作段階）」
- Electron Main Process のコードは作成済みだが、本番ビルド・exe化は未実装
- LLM接続には Ollama 等がローカルで動作している必要がある

---

## 更新履歴

| 日付 | 概要 |
|------|------|
| 2026-04-07 | プロトタイプ 完成（初期実装一式） |
| 2026-04-07 | Toolbarアイコン修正（エクスポート、保存按钮） |
| 2026-04-09 | TypeScriptエラー修正、Webアプリビルド完了 |
| 2026-04-09 | LLM接続テスト開始 - Ollama API応答確認済み |

---

## 2026-04-09 - LLM接続テスト

### 確認事項

- **Ollamaサーバー**: 正常動作（http://localhost:11434）
- **利用可能なモデル**:
  - gemma4:e4b (9.6GB)
  - qwen3.5:9b (6.5GB)
  - qwen3.5:latest (6.5GB)
  - gemma3:4b (3.3GB)
  - 等

- **Chat APIテスト**: 成功
  ```
  curl -s http://localhost:11434/v1/chat/completions
  → "Hello! How can I help you today?"
  ```

### 次のステップ

- Webアプリ起動確認（localhost:3000）
- ブラウザから設定UIでOllamaモデル選択
- チャットパネルでAI応答テスト

---

現在のステータス

- ✅ Webアプリ: ビルドOK
- ✅ TypeScript: クリーン
- ⚠️ Electron: 調査中
- ✅ LLM (Ollama): API応答確認済み

---

## 2026-04-07 ( continued) - UI改善

### 修正内容

- **Toolbar**
  - エクスポートアイコンメニューを三点ドットに変更
  - Save Asアイコンを新規ファイル保存様式に変更
  - 保存ボタンを電球アイコンに変更（赤:未保存、緑:保存済）

---

## 実装した機能

- ✅ ファイルI/O機能
- ✅ Electron Main Process + IPC
- ✅ LLM統合（Ollama, AnythingLLM, OpenAI, Custom）
- ✅ 設定UI（プロバイダー選択）
- ✅ 自動保存（IndexedDB/Dexie.js）
- ✅ テーマ切替（Light/Dark/System）
- ✅ キーボードショートカット
- ✅ エクスポート機能（MD, HTML, PDF, JSON）
- ✅ ドキュメント作成（DEV-MEMO.md, HISTORY.md, USAGE.md）
- ✅ .gitignore, vercel.json作成


---

---

## 2026-04-11 - Chat UI改善

### 修正内容

- ChatPanel
  - テンプレートを入力欄上部に配置
  - 入力欄を2行に拡大
  - 送信ボタンの位置調整
  - 初期メッセージ領域の高さ調整

### 現在のステータス

- Webアプリ: ビルドOK、動作確認
- TypeScript: クリーンなビルド
- Electron: 調査中（モジュール形式問題）
- LLM (Ollama): API応答確認済み
- ブラウザでのLLMチャットテスト: 未完了

---

## 2026-04-11 - LLM接続改善 + Streaming対応

### 修正内容

- **llmClient.ts**: qwen3.5モデルのreasoning出力対応
  - `delta.reasoning` フィールドのサポートを追加
  - 思考過程もチャット画面に-streamingされるように

- **vite.config.ts**: Ollamaへのプロキシ設定追加
  - 開発環境でCORS問題を回避するプロキシ設定

### 動作確認

- Ollama Streaming API: 正常動作確認
- curlテスト:
  ```bash
  curl -s http://localhost:11434/v1/chat/completions
  → content + reasoning 両方のstreaming正常
  ```

### 現在のステータス

- Webアプリ: ビルドOK
- TypeScript: クリーンなビルド
- Electron: 調査中
- LLM (Ollama): Streaming API確認済み (qwen3.5:latest)
- ブラウザテスト: プロキシ設定追加済み

---

## 2026-04-11 - Vite dev server問題

### 問題

- `npm run dev` (Vite dev server) が起動しないまたは切断される問題
- 原因: Viteプロセスがバックグラウンドで維持されない

### 対応

- ビルド (`npm run build`) は正常動作
- distフォルダにHTML/CSS/JSが正しく生成されることを確認
- 代替案として静的サーバーでの起動を試行中

### 現在のステータス

- Webアプリ: ビルドOK
- TypeScript: クリーン
- LLM (Ollama): curlでAPI応答確認済み (qwen3.5:latest)
- Vite dev server: 起動問題あり、解决方法研究中

---

## 2026-04-11 - プロジェクト総点検

### 確認結果

#### ビルド・TypeScript ✅
- `npm run build`: 正常動作
- `npx tsc --noEmit`: エラーなし

#### ファイル構成 ✅
```
packages/editor/src/
├── components/
│   ├── Chat/ChatPanel.tsx
│   ├── Editor/LexicalEditor.tsx
│   ├── Preview/MarkdownPreview.tsx
│   ├── Settings/Settings.tsx
│   ├── Sidebar/Sidebar.tsx
│   └── Toolbar/Toolbar.tsx
├── stores/
│   ├── chatStore.ts
│   ├── editorStore.ts
│   ├── llmStore.ts
│   ├── shortcutStore.ts
│   └── themeStore.ts
├── utils/
│   ├── db.ts
│   ├── fileOperations.ts
│   ├── llmClient.ts
│   └── markdown.ts
├── types/index.ts
├── App.tsx
├── main.tsx
└── index.css
```

#### 実装済み機能 ✅
- Lexical エディター + Markdown プレビュー
- ファイルI/O（Web API / Electron IPC）
- LLM統合（Ollama, AnythingLLM, OpenAI, Custom）
- 自動保存（IndexedDB/Dexie.js）
- テーマ切替（Light/Dark/System）
- キーボードショートカット
- エクスポート機能（MD, HTML, PDF, JSON）
- Chat UI

#### 現在の問題 ⚠️
- Vite dev server起動問題（npm run devが正常に動作しない）
- ブラウザでの動作確認が未完了

#### 代替手段
- `npm run build` でdistフォルダにビルド
- 静的サーバー経由でアクセス可能

---

## 2026-04-11 - GitHub Push前 総点検

### 実施内容

- リポジトリ構造の確認
- ビルド検証（Vite + Electron）
- .gitignore の確認
- 機密情報（APIキー等）のチェック
- electron/ ディレクトリの問題確認

### 確認結果 ✅

| チェック項目 | 結果 |
|-------------|------|
| Vite ビルド | ✅ 成功（dist/ 生成済み） |
| Electron ビルド | ✅ 成功（tsc 正常コンパイル） |
| TypeScript 診断 | ✅ エラー 0件、警告 0件 |
| .gitignore | ✅ node_modules, dist, .env 等適切に設定 |
| .env ファイル | ✅ 存在しない（安全） |
| 機密情報 | ✅ ハードコードされたAPIキー等なし |

### 発見された問題 ⚠️

| # | 問題 | 重要度 | 対応 |
|---|------|--------|------|
| 1 | Gitリポジトリ未初期化 | 高 | `git init` で初期化必要 |
| 2 | electron/main.ts と main.cjs の不整合 | 中 | main.tsは`preload.cjs`、main.cjsは`preload.js`を参照 |
| 3 | electron/ に .ts/.js/.cjs が混在 | 中 | ビルド成果物管理の一貫性を推奨 |

### electron/ ディレクトリの問題

- `main.ts` → `preload.cjs` を参照（line 17）
- `main.cjs` → `preload.js` を参照（一致なし）
- `tsc -p tsconfig.electron.json` は `.js` ファイルを出力
- `.gitignore` は `.js` ファイルのみを無視

### GitHub Push 前的推奨アクション

1. **Git初期化**
   ```bash
   git init
   git remote add origin https://github.com/username/right-stuff-editor.git
   ```

2. **electron/main.ts の修正**（推奨）
   - 現在の `preload.cjs` 参照を `preload.js` に変更
   - または package.json の entry point を `main.js` に変更

3. **push前確認**
   ```bash
   git status --ignored
   ```

### 備考

- ビルド警告: チャンクサイズ 1MB（警告のみ、エラーなし）
- .DS_Store: .gitignore で無視設定済み
- DEV-MEMO.md に Live Document セクションを追加済み

---

## 2026-04-22 - wterm ターミナル統合

### 概要

既存の自行开发ターミナルを Vercel Labs の wterm に置き換え

### 新規導入パッケージ

- `@wterm/dom` - wterm core DOM package
- `@wterm/react` - wterm React component

### 主な変更

| ファイル | 変更内容 |
|----------|----------|
| `package.json` | @wterm/dom, @wterm/react を追加 |
| `components/Terminal/WTermTerminal.tsx` | 新規作成（wterm使用） |
| `App.tsx` | WTermTerminal に切り替え |

### 変更理由

- 本格的なターミナルエミュレータ体验を提供
- テーマ対応（Default, Solarized Dark, Monokai, Light）
- パフォーマンス改善（Dirty-row tracking）
- ネイティブテキスト選択対応

### 備考

- ビルド成功（1,104.88 kB）

---

## 2026-05-08 - ASM (agent-skill-manager) 統合 実装開始

### 概要

ASM (agent-skill-manager) を AI Chat インターフェースに統合する。
ASM は CLI/TUI スキルマネージャーで、AIコーディングエージェント向けのスキル管理を提供する。

### 新規ファイル

```
packages/editor/src/
├── components/ASM/
│   ├── ASMPanel.tsx          # メインパネル
│   ├── ASMSearch.tsx         # 検索 + フィルター
│   ├── ASMSkillList.tsx      # スキル一覧
│   └── ASMDetail.tsx         # スキル詳細
├── stores/asmStore.ts        # ASM状態管理 (Zustand + persist)
└── utils/asmClient.ts        # ASM CLI ラッパー
```

### 変更ファイル

| ファイル | 変更内容 |
|----------|----------|
| `types/index.ts` | ASMSkill, ASMState 型定義追加 |
| `App.tsx` | asmOpen state + toggleAsm追加、ASMパネル表示 |
| `Toolbar.tsx` | ASMトグルボタン追加 |
| `shortcutStore.ts` | toggleAsm ショートカット追加 |

### 設計決定

| 項目 | 決定 |
|------|------|
| **配置** | ASMを**独立したパネル**として追加（Chatとは別トグル） |
| **Web時** | 「ブラウザでは利用不可」と表示 |
| **デザイン** | パッケージマネージャ風（リスト + 詳細ビュー） |
| **ASM CLI** | child_process.exec 経由で呼び出し（Electronのみ） |

### レイアウト方針

- Chat(💬) と ASM(🧩) は同じ右パネル領域を共有
- 両方開いた場合: 幅を分割 or タブ切替
- 閉じるボタンで個別に閉じられる
- Toolbar にトグルボタン（Chat隣に🧩アイコン）

---

## 2026-05-08 - Copy to Editor 不具合修正（Lexical ブリッジ）

### 問題

ChatPanel の Assistant メッセージにあるコピーボタンをクリックしても、リッチテキスト（Lexical）モードでエディタに内容が反映されなかった。

### 原因

- Lexical は独自の内部 EditorState を管理しており、`editorStore.content` を参照しない
- `appendContent()` は store の文字列に追記するだけのため、Lexical モードでは見た目に反映されず、JSON も破損する

### 修正内容

| # | ファイル | 変更 |
|---|---------|------|
| 1 | `src/utils/editorBridge.ts` | Lexical エディタインスタンスを保持するモジュール変数。`registerLexicalEditor()` / `appendTextToLexical()` を提供 |
| 2 | `LexicalEditor.tsx` | `EditorRegistrationPlugin` を追加。`useLexicalComposerContext()` で editor を bridge に登録 |
| 3 | `ChatPanel.tsx` | コピーボタンがリッチテキストモード時は `appendTextToLexical()`、Markdown モード時は `appendContent()` を使用 |

### 動作

| モード | 動作 |
|--------|------|
| **Rich Text** | Lexical の `editor.update()` で段落 + テキストノードを挿入。`OnChangePlugin` が自動発火 |
| **Markdown** | 従来通り `editorStore.content` に文字列追記 |

---

## 2026-05-08 - Electron ターミナルを OS ターミナルと連動

### 概要

Electron 版でターミナルボタンを押した際、内蔵モックターミナルの代わりに OS のターミナルアプリケーションを起動する。

### 変更内容

| # | ファイル | 変更 |
|---|---------|------|
| 1 | `electron/main.ts` | `shell:openTerminal` IPC ハンドラ追加。`process.platform` で OS 判定（macOS: `open -a Terminal`, Windows: `start cmd`, Linux: `x-terminal-emulator`） |
| 2 | `electron/preload.ts` | `openTerminal()` を contextBridge に公開 |
| 3 | `src/utils/fileOperations.ts` | `Window.electronAPI` 型に `openTerminal` 追加 |
| 4 | `src/components/Terminal/Terminal.tsx` | Electron 検出ロジック追加。Electron 時は `openTerminal` IPC を呼び出し、パネル内に「● System Terminal Active」ステータスを表示。`relaunch` コマンド / ↻ ボタンで再起動可能 |

### 動作

| 環境 | 動作 |
|------|------|
| **Electron** | Terminal.app が別ウィンドウで起動 |
| **ブラウザ** | 従来通りモックターミナル |
