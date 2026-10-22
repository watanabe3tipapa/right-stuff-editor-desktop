# Right-Stuff Editor Desktop

<p align="center">
  <strong>リッチテキスト、Markdown、AI、ローカルLLMをひとつにした編集環境</strong>
</p>

<p align="center">
  <a href="https://github.com/watanabe3tipapa/right-stuff-editor-desktop"><img src="https://img.shields.io/badge/version-v0.1.0-2563eb?style=flat-square" alt="Version v0.1.0" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-0f766e?style=flat-square" alt="MIT License" /></a>
  <img src="https://img.shields.io/badge/status-development-f59e0b?style=flat-square" alt="Development status" />
</p>

<p align="center">
  <a href="#概要">概要</a> · <a href="#機能">機能</a> · <a href="#クイックスタート">クイックスタート</a> · <a href="#開発と検証">開発と検証</a>
</p>

> **Right-Stuff Editor Desktop** は、文章とアイデアに集中するための macOS 向けローカルファースト編集環境です。リッチテキストとMarkdownを行き来し、AIの補完・変換・チャットをいつでも呼び出せます。文書は指定フォルダーの Markdown ファイルとして保存され、Apple Notes の選択ノートも直接編集できます。

## 概要

Right-Stuff Editor Desktop は、書式を保った編集とMarkdownの可搬性を両立する tinyjs デスクトップアプリです。文書はワークスペース（既定: `~/Documents/Right-Stuff`）内の Markdown ファイルに保存し、メタデータ・履歴・設定・執筆統計は SQLite に保持します。Apple Notes のノートは読み取り専用判定を行ったうえで直接更新できます。AI機能は外部サービスまたはローカルLLMへ明示的に接続した場合だけ動作します。

| 項目 | 内容 |
| --- | --- |
| 編集方式 | LexicalによるリッチテキストとMarkdownの切替 |
| 保存先 | ワークスペース内の Markdown ファイル + アプリデータの SQLite。クラウド同期は実装していません。 |
| AI連携 | Ollama、OpenAI、Anthropic、Gemini、Groq、DeepSeek、Mistral、Together、OpenRouter、Perplexity、xAI、Hugging Face、AnythingLLM、LM Studio、Foundry Local、Unsloth、Apple Foundation Models、カスタム（計18種） |
| AI機能 | ゴーストテキスト補完、スラッシュコマンド、選択テキストのインラインAI変換、AIチャット |
| 文体・記憶 | 文体プロファイル、エンティティメモリ（固有名詞の一貫表記） |
| スキル管理 | Agent Skill Manager（現在は無効化。ASM CLI 連携は今後の課題）。 |
| 実行形態 | tinyjs による macOS デスクトップアプリ（Web配布なし） |
| 現行バージョン | **v0.1.0**（tinyjs デスクトップ版） |
| ローカルファイル連携 | 開いたファイルへの上書き保存、未保存時の離脱検知 |
| プレビュー強化 | GitHub Alerts、Mermaid図表、シンタックスハイライト、KaTeX数式 |
| mdv連携 | 現在は無効（内蔵プレビューを利用） |

## 旧 Dash 版の主な変更（アーカイブ）

以下は tinyjs デスクトップ版へ移行する前の履歴です。現行版の概要はルートの [README](../README.md) を参照してください。

| 分類 | 更新内容 |
| --- | --- |
| 改名 | 旧名称から **Right-Stuff Editor Dash** へリブランド（永続化キー・データベース名・OG画像も更新）。 |
| 執筆体験 | **Zen モード**（周囲を隠して集中）、**タイプライターモード**（カーソル行を中央維持）、**KaTeX 数式**（`$...$` / `$$...$$`）を追加。 |
| AI補完 | **ゴーストテキスト補完**。入力を止めると AI が続きを候補表示し、`Tab` で採用 / `Esc` で破棄。待機時間・候補長は設定可能。 |
| スラッシュコマンド | 行頭で `/` を入力すると挿入メニューを表示。見出し・引用・リスト・チェックリスト・コード・表・水平線をワンアクションで挿入。 |
| インラインAI | テキストを選択すると「✨ AI」ボタンが出現。**校正・書き直し・簡潔化・拡充・要約・英訳・和訳・フォーマル化・カジュアル化・箇条書き化**（計10アクション）を選択肢として適用。 |
| 文体プロファイル | 名前付きのシステムプロンプトを保存・切替可能。有効なプロファイルはすべてのAIリクエストに適用されます。 |
| エンティティメモリ | よく使う固有名詞（人物・プロジェクト・用語・場所）を登録し、AIが一貫した表記で回答するようにしました。 |
| Settings タブ化 | 設定画面を「一般 / AI / 文体・メモリ / Gist」の4タブに再編。 |
| LLMプロバイダ | Anthropic、Gemini、Groq、DeepSeek、Mistral、Together、OpenRouter、Perplexity、xAI、Hugging Face を追加し、**計18種**に対応。 |

### これまでの主な変更（v0.3.0〜v0.4.3）

| バージョン | 概要 |
| --- | --- |
| v0.4.3 | アプリ内ターミナルを実OSシェル化（wterm + node-pty）。作業ディレクトリ追従、PTY出力の取りこぼし防止。 |
| v0.4.2 | AIチャットへ文書コンテキストを自動送信。応答のMarkdown表示、System Prompt 設定を追加。 |
| v0.4.1 | Apple Foundation Models をローカルLLMとして対応（macOS 26 + Apple Silicon、APIキー不要）。 |
| v0.4.0 | 編集ツールバー拡充（下線・打消し線・文字色・ハイライト・サイズ）、画像のD&D・貼り付け、文書の検索・並び替え・複製。 |
| v0.3.1 | ローカルファイルの上書き保存、未保存離脱検知、強化プレビュー（Alerts/Mermaid/ハイライト）、mdv連携、Unsloth対応。 |
| v0.3.0 | GitHub Gist 連携を新規追加（アップロード、Gist一覧の閲覧・インポート）。 |


## 機能

### 編集とプレビュー

リッチテキストモードでは見出し、太字、引用、リスト、コードブロックなどを操作できます。Markdownモードへ切り替えて直接記述することもでき、同じ内容をプレビューで確認できます。文書は複数作成でき、サイドバーから開く、名前を変更する、削除するといった操作に対応します。

プレビューはGitHubスタイルの表示に対応しています。

| プレビュー機能 | 説明 |
| --- | --- |
| GitHub Alerts | `> [!NOTE]` / `[!TIP]` / `[!IMPORTANT]` / `[!WARNING]` / `[!CAUTION]` を色分け表示 |
| Mermaid図表 | ` ```mermaid ` コードブロックをダイアグラムとして描画（テーマ連動） |
| シンタックスハイライト | コードブロックを言語ごとに色分け（rehype-highlight） |
| GFM | テーブル・チェックリスト・取り消し線・自動リンク |

### AIアシスタントと執筆支援

AIはチャットだけでなく、編集中のテキストそのものにも働きかけます。接続先はOllamaなどのローカルLLMやOpenAI互換API、主要なクラウドAPIから選べます。

| 機能 | 説明 |
| --- | --- |
| ゴーストテキスト補完 | 入力を止めると AI が続きを候補表示。`Tab` で採用 / `Esc` で破棄（設定でON/OFF・待機時間・候補長を調整） |
| スラッシュコマンド | 行頭 `/` で見出し・引用・リスト・チェックリスト・コード・表・水平線を挿入 |
| インラインAI 変換 | テキスト選択時「✨ AI」から、校正・書き直し・簡潔化・拡充・要約・英訳・和訳・フォーマル化・カジュアル化・箇条書き化を適用 |
| 文体プロファイル | 名前付きのシステムプロンプトを保存・切替。有効なプロファイルは全AIリクエストに適用 |
| エンティティメモリ | 固有名詞（人物・プロジェクト・用語・場所）を登録し、AIの表記を一貫させます |
| AI チャット | LLMと会話。編集中の文書を文脈として自動送信可能 |
| スキル管理 | Agent Skill Manager（現在は無効） |

#### LLMプロバイダ（計18種）

Ollama、OpenAI、Anthropic、Gemini、Groq、DeepSeek、Mistral、Together、OpenRouter、Perplexity、xAI、Hugging Face、AnythingLLM、LM Studio、Foundry Local、Unsloth、Apple Foundation Models、カスタムエンドポイント。多くは OpenAI 互換 API で、設定画面からモデル一覧を自動取得します。

#### Unsloth

**Unsloth** は、ローカルでモデルの量子化（数値化）と推論を行うツールです。起動するとOpenAI互換のAPIをポート8888（既定 `http://127.0.0.1:8888`）で公開し、`/v1/chat/completions` と `/v1/models` を同じポートで提供します。既存のOpenAI互換ストリーミング実装をそのまま利用するため、設定のみで接続できます。

1. Unslothをインストール・起動します（https://unsloth.ai/download）。
2. SettingsのLLM Providerで **Unsloth** を選択します（エンドポイントは既定 `http://127.0.0.1:8888/v1/chat/completions` が入ります）。
3. Unslothが発行するAPIキー（`sk-unsloth-...`）を入力します。入力すると `/v1/models` からモデル一覧が自動取得され、ドロップダウンから選択できます。

> UnslothはローカルAPIのため、外部にデータを送信しません。APIキーはローカルの端末設定として保持されます。

#### Apple Foundation Models

**Apple FM** は、macOSに内蔵されたオンデバイスモデル（Apple Intelligence）に接続するプロバイダーです。端末内で推論するため本文が外部に送信されず、APIキーも不要です。macOS 26以降とApple Siliconが必要です。

Foundation ModelsフレームワークはSwiftからしか呼べないため、リポジトリ同梱の小さなSwiftブリッジ（`applefm/`）が `127.0.0.1:8765` にOpenAI互換APIを公開します（`/v1/chat/completions`・`/v1/models`・`/health`、SSEストリーミング対応）。

1. ブリッジを起動します。

   ```bash
   npm run applefm
   ```

   アプリ内からは起動しません。別ターミナルで起動したままにしてください。

2. SettingsのLLM Providerで **Apple FM** を選択します（既定 `http://127.0.0.1:8765/v1/chat/completions`）。
3. 「状態を確認」で `available` / `appleIntelligenceNotEnabled` などの状態を確認できます。

> ブリッジは `127.0.0.1` のみにバインドし、外部には公開しません。オンデバイスモデルのコンテキストは小さいため、Max Tokensは1024程度を推奨します。

### ローカルファイル連携

ワークスペース内の Markdown / TXT を開いて編集し、そのまま保存できます。ツールバーの読み込み・書き出しは macOS のネイティブダイアログを使います。保存は一時ファイルへの書き込み後に rename する原子的な方式で、外部変更はハッシュと mtime で検出します。

### mdv連携

mdv 連携は現在の tinyjs 版では無効です。代わりに内蔵プレビュー（GitHub Alerts / Mermaid / KaTeX / シンタックスハイライト）を利用してください。

> mdv 連携を復活させる場合は、バックエンドから `mdv` を起動する API を追加する必要があります。

### 保存とエクスポート

編集内容は既定で30秒ごとにワークスペースへ自動保存されます。保存ステータスは画面下部で確認でき、失敗時には再試行できます。ファイルの読み込み、Markdown、HTML、PDF、JSON、TXT、DOCX、Ollama Modelfile への書き出しにも対応します。PDF は印刷ダイアログ経由です。

### GitHub Gist連携

文書をGitHub Gistにワンクリックでアップロードできます。Settings画面でPersonal Access Token（PAT）を設定し、ツールバーの「Upload to Gist」ボタンからアップロードします。Gist一覧の閲覧・検索・フィルタリング・プレビュー・エディタへのインポートにも対応しています。

| 機能 | 説明 |
| --- | --- |
| Gistアップロード | 文書をGistに保存（新規作成・既存更新） |
| Gist Viewer | Gist一覧の閲覧・検索・フィルタ |
| プレビュー | Gist内容の読み取り専用表示 |
| インポート | Gist内容をエディタに読み込み |

| 機能 | tinyjs デスクトップ版 |
| --- | --- |
| Markdown ワークスペース自動保存 | 対応 |
| ローカルファイルの読込・保存 | ネイティブダイアログで対応 |
| GitHub Gist連携 | 対応 |
| 強化プレビュー（Alerts/Mermaid/KaTeX/ハイライト） | 対応 |
| mdv連携（Open in mdv） | 未対応 |
| アプリ内ターミナル | macOS の PTY を wterm で表示 |
| Agent Skill Manager | 未対応（UI は非表示） |
| Apple Notes の閲覧・編集 | 対応（権限が必要） |
| バージョン履歴・リカバリ | SQLite に保存 |

## クイックスタート

### 開発起動

```bash
git clone <repo>
cd right-stuff-editor-desktop
npm ci
npm run dev
```

別ターミナルで tinyjs を起動します。

```bash
tinyjs dev
```

Vite は `127.0.0.1:3000` で起動し、tinyjs がバックエンドとウィンドウを提供します。

### パッケージ

```bash
npm run package
open "dist/Right-Stuff Editor Desktop.app"
```

`npm run package` は `tinyjs build` の後に `scripts/postbuild-macos.sh` を実行し、Apple Events の利用目的を Info.plist へ追加して ad-hoc 署名します。Apple Notes 連携にはこの手順が必須です。

### アプリ内ターミナル

macOS の `/usr/bin/python3` を使って PTY ブリッジを起動し、`$SHELL`（既定 `/bin/zsh`）を wterm で表示します。シェル設定によっては初回プロンプトまで数秒かかることがあります。

## 使い方

1. 公開ページの **ライブデモ** を開くか、`/editor` に直接アクセスします。
2. 初回ガイドから文書を作成するか、既定の案内文を編集します。
3. 上部の切替でリッチテキストまたはMarkdownを選び、右側のプレビューで確認します。
4. AI補完（ゴーストテキスト）やスラッシュコマンド、テキスト選択時のインラインAI変換を執筆に合わせて使います。
5. AIチャット、スキル管理、ターミナルは必要なときだけツールバーから開きます。
6. 画面下部の保存状態を確認しながら編集を続けます。
7. SettingsでGitHub PATを設定し、ツールバーの「Upload to Gist」で文書をGistに保存できます。
8. 「My Gists」ボタンでGist一覧を閲覧し、エディタにインポートできます。
9. ローカルファイルを開くと、保存時に同じファイルへ上書きできます。フッターにファイル名が表示されます。
10. Notes ボタンから Apple Notes のフォルダーとノートを選び、そのまま編集できます。

主要なショートカットは、`Ctrl/Cmd + S` の保存、`Ctrl/Cmd + ,` の設定、`Ctrl/Cmd + Shift + Z` のZenモード、`Ctrl/Cmd + Shift + T` のタイプライターモード、`Ctrl/Cmd + Shift + A` のスキル管理、`Ctrl/Cmd + \`` のターミナル、`/` のスラッシュコマンドです。設定ではテーマ、LLMプロバイダー、エンドポイント、モデル、APIキー、AI補完、文体プロファイル、エンティティメモリ、GitHub Gist認証を管理できます。

## データとセキュリティ

Right-Stuff Editor Desktop は、文書をワークスペースの Markdown ファイルへ、設定・履歴・統計をアプリデータの SQLite へ保存するローカルファースト設計です。ワークスペースをバックアップ・同期すれば別端末へ移行できます。重要な文書は定期的にエクスポートしてください。

> APIキーと文章を外部LLMへ送信するかどうかは、選択したプロバイダーおよびエンドポイントに依存します。外部サービスへ接続する前に、そのサービスの利用規約とデータ取扱方針を確認してください。

## アーキテクチャ

```text
right-stuff-editor-desktop/
├── src/
│   ├── backend/
│   │   ├── main.ts             # tinyjs API ハンドラーと初期化
│   │   ├── workspace.ts        # Markdown CRUD、競合検出、バックアップ
│   │   ├── db.ts               # SQLite（設定・履歴・統計・テンプレート・チャット）
│   │   ├── notes-bridge.ts     # Apple Notes AppleScript 連携
│   │   ├── markdown.ts         # frontmatter 解析・生成
│   │   └── terminal.ts         # PTY ブリッジ（Python + wterm）
│   ├── frontend/
│   │   ├── components/         # Editor / Preview / Chat / Settings / Notes / Terminal ほか
│   │   ├── stores/             # Zustand（文書・テーマ・ショートカット）
│   │   └── utils/              # desktop ブリッジ、HTML⇄Markdown、LLM
│   ├── shared/types.ts         # バックエンドとフロントエンドの共有型
│   └── frontend/index.html
├── scripts/postbuild-macos.sh  # Info.plist と ad-hoc 署名
├── public/wterm.wasm           # ターミナル描画用 WASM
├── tinyjs.json                 # tinyjs アプリ設定
└── package.json
```

## 開発と検証

型検査・ビルド・Lint は次を実行します。

```bash
npm run typecheck
npm run build
npm run lint
```

アプリ全体の確認は `tinyjs dev` または `npm run package` 後に起動して行います。文書の作成・切替、自動保存、バージョン履歴、Notes の読み取り・保存、ターミナル起動を確認してください。

## 既知の制約と次の改善候補

- 同期・共同編集は提供していません。バックアップはワークスペース内 `.right-stuff/backups` に作成されます。
- ASM と mdv 連携は現在無効です。
- アプリ内ターミナルは macOS のみ対応で、`/usr/bin/python3` が必要です。
- Apple Notes 連携には macOS の自動化権限（Notes）が必要です。共有ノートなど一部は読み取り専用になります。
- PDF 出力は印刷ダイアログ経由です（ネイティブ PDF 書き出しは今後の課題）。
- Vite のプロダクションビルドは大きな JavaScript チャンクの警告を出します。動的インポートによる分割を検討しています。

## ライセンス

本リポジトリは [MIT License](./LICENSE) です。詳細はリポジトリ直下の `LICENSE` ファイルを参照してください。

## 関連ドキュメント

| 文書 | 内容 |
| --- | --- |
| [USAGE.md](./USAGE.md) | 詳しい利用手順 |
| [HISTORY.md](./HISTORY.md) | 更新履歴 |
| [DEV-MEMO.md](./DEV-MEMO.md) | 開発メモ |
| [README_ja.md](./README_ja.md) | 旧日本語READMEからの案内 |
