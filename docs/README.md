# Right-Stuff Editor Dash

<p align="center">
  <strong>リッチテキスト、Markdown、AI、ローカルLLMをひとつにした編集環境</strong>
</p>

<p align="center">
  <a href="https://github.com/watanabe3tipapa/right-stuff-editor-dash"><img src="https://img.shields.io/badge/version-v0.5.0-2563eb?style=flat-square" alt="Version v0.5.0" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-0f766e?style=flat-square" alt="MIT License" /></a>
  <img src="https://img.shields.io/badge/status-development-f59e0b?style=flat-square" alt="Development status" />
</p>

<p align="center">
  <a href="#概要">概要</a> · <a href="#v050の主な変更">v0.5.0</a> · <a href="#機能">機能</a> · <a href="#クイックスタート">クイックスタート</a> · <a href="#開発と検証">開発と検証</a>
</p>

> **Right-Stuff Editor Dash** は、文章とアイデアに集中するためのローカルファースト編集環境です。リッチテキストとMarkdownを行き来し、AIの補完・変換・チャットをいつでも呼び出せます。必要なときだけLLMやスキル管理、ターミナルを開けます。

## 概要

Right-Stuff Editor Dash は、書式を保った編集とMarkdownの可搬性を両立するエディタです。ブラウザ版では文書を端末内のIndexedDBへ保存し、Electron版ではローカルのファイル操作やOSターミナルとの連携も利用できます。AI機能は外部サービスまたはローカルLLMへ明示的に接続した場合だけ動作し、設定したAPIキーはブラウザのローカル設定として扱われます。

| 項目 | 内容 |
| --- | --- |
| 編集方式 | LexicalによるリッチテキストとMarkdownの切替 |
| 保存先 | ブラウザのIndexedDB。クラウド同期は実装していません。 |
| AI連携 | Ollama、OpenAI、Anthropic、Gemini、Groq、DeepSeek、Mistral、Together、OpenRouter、Perplexity、xAI、Hugging Face、AnythingLLM、LM Studio、Foundry Local、Unsloth、Apple Foundation Models、カスタム（計18種） |
| AI機能 | ゴーストテキスト補完、スラッシュコマンド、選択テキストのインラインAI変換、AIチャット |
| 文体・記憶 | 文体プロファイル、エンティティメモリ（固有名詞の一貫表記） |
| スキル管理 | Agent Skill Manager。Electronデスクトップ版のみ利用可能です。 |
| 実行形態 | ViteによるWeb版、およびElectronデスクトップ版 |
| 現行バージョン | **v0.5.0** |
| ローカルファイル連携 | 開いたファイルへの上書き保存、未保存時の離脱検知 |
| プレビュー強化 | GitHub Alerts、Mermaid図表、シンタックスハイライト、KaTeX数式 |
| mdv連携 | Electron版で `mdv` を起動し、高品質プレビューを別窓で表示 |

## v0.5.0の主な変更

今回の更新では、リポジトリを **Right-Stuff Editor Dash** へ改名し、AIによる執筆支援機能を一気に拡充しました。名称は Textus に倣っています。

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
| インラインAI変換 | テキスト選択時「✨ AI」から、校正・書き直し・簡潔化・拡充・要約・英訳・和訳・フォーマル化・カジュアル化・箇条書き化を適用 |
| 文体プロファイル | 名前付きのシステムプロンプトを保存・切替。有効なプロファイルは全AIリクエストに適用 |
| エンティティメモリ | 固有名詞（人物・プロジェクト・用語・場所）を登録し、AIの表記を一貫させます |
| AIチャット | LLMと会話。編集中の文書を文脈として自動送信可能 |
| スキル管理 | Agent Skill Manager。スキルの検索・インストール管理（Electron版のみ） |

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

Foundation ModelsフレームワークはSwiftからしか呼べないため、リポジトリ同梱の小さなSwiftブリッジ（`packages/editor/applefm`）が `127.0.0.1:8765` にOpenAI互換APIを公開します（`/v1/chat/completions`・`/v1/models`・`/health`、SSEストリーミング対応）。

1. ブリッジを起動します。

   ```bash
   cd packages/editor
   npm run applefm
   ```

   Electron版では Settings → **Apple FM** の「サーバー起動」ボタンからも起動できます。

2. SettingsのLLM Providerで **Apple FM** を選択します（既定 `http://127.0.0.1:8765/v1/chat/completions`）。
3. 「状態を確認」で `available` / `appleIntelligenceNotEnabled` などの状態を確認できます。

> ブリッジは `127.0.0.1` のみにバインドし、外部には公開しません。オンデバイスモデルのコンテキストは小さいため、Max Tokensは1024程度を推奨します。

### ローカルファイル連携

開いたローカルファイル（Markdown / TXT）を編集し、そのまま**同じファイルへ上書き保存**できます。フッターに現在のファイル名が表示され、未保存のまま閉じようとすると離脱確認が出ます。ブラウザ版はFile System Access API（Chrome/Edge）、Electron版はネイティブダイアログを使います。

### mdv連携

Electronデスクトップ版では、ツールバーの **Open in mdv** ボタンからローカルで動作するmdvツールを起動し、開いている文書の高品質プレビューを別ウィンドウで表示できます。mdvはローカルファイルを監視するため、エディタでの保存が自動でプレビューに反映されます。

> mdv連携には `mdv` がローカルにインストールされている必要があります。未インストール時はフッターに案内が表示されます。ブラウザ版ではmdvは利用できません（内蔵の強化プレビューをご利用ください）。

### 保存とエクスポート

編集内容は既定で30秒ごとに端末内へ自動保存されます。保存ステータスは画面下部で確認でき、失敗時には再試行できます。ファイルの読み込み、Markdown、HTML、PDF、JSON、TXT、DOCX、Ollama Modelfileへの書き出しにも対応します。利用可否はWebとElectronで異なります。

### GitHub Gist連携

文書をGitHub Gistにワンクリックでアップロードできます。Settings画面でPersonal Access Token（PAT）を設定し、ツールバーの「Upload to Gist」ボタンからアップロードします。Gist一覧の閲覧・検索・フィルタリング・プレビュー・エディタへのインポートにも対応しています。

| 機能 | 説明 |
| --- | --- |
| Gistアップロード | 文書をGistに保存（新規作成・既存更新） |
| Gist Viewer | Gist一覧の閲覧・検索・フィルタ |
| プレビュー | Gist内容の読み取り専用表示 |
| インポート | Gist内容をエディタに読み込み |

| 機能 | Web版 | Electron版 |
| --- | --- | --- |
| IndexedDB自動保存 | 対応 | 対応 |
| ローカルファイルの読込・保存 | File System Access API（Chrome/Edge）で利用 | ネイティブ連携で利用 |
| GitHub Gist連携 | 対応 | 対応 |
| 強化プレビュー（Alerts/Mermaid/ハイライト） | 対応 | 対応 |
| mdv連携（Open in mdv） | 非対応 | 対応 |
| アプリ内ターミナル | モック表示（入力の反表示のみ） | 実OSシェルを wterm + node-pty で実行 |
| Agent Skill Manager | 閲覧のみ・機能制限 | 対応 |

## クイックスタート

### Web版の開発起動

```bash
git clone https://github.com/watanabe3tipapa/right-stuff-editor-dash.git
cd right-stuff-editor-dash/packages/editor
npm ci
npm run dev
```

Viteが表示するローカルURLを開いてください。公開ページは `/`、編集画面は `/editor` です。

### Electron版の開発起動

```bash
cd right-stuff-editor-dash/packages/editor
npm ci
npm run electron:dev
```

Electron版ではアプリ内ターミナル（実OSシェル）およびAgent Skill Managerを利用できます。使用するLLMやASM CLIは、別途ローカル環境にインストール・起動してください。

アプリ内ターミナルは `node-pty`（ネイティブモジュール）を使用します。macOS で `posix_spawnp failed` と表示された場合は、ヘルパーの実行権限を確認してください。

```bash
chmod +x node_modules/node-pty/prebuilds/darwin-arm64/spawn-helper
```

起動できるシェルは `process.env.SHELL`（未設定時は `/bin/bash`）です。

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
10. Electron版ではツールバーの「Open in mdv」からmdvプレビューを別窓で開けます。

主要なショートカットは、`Ctrl/Cmd + S` の保存、`Ctrl/Cmd + ,` の設定、`Ctrl/Cmd + Shift + Z` のZenモード、`Ctrl/Cmd + Shift + T` のタイプライターモード、`Ctrl/Cmd + Shift + A` のスキル管理、`Ctrl/Cmd + \`` のターミナル、`/` のスラッシュコマンドです。設定ではテーマ、LLMプロバイダー、エンドポイント、モデル、APIキー、AI補完、文体プロファイル、エンティティメモリ、GitHub Gist認証を管理できます。

## データとセキュリティ

Right-Stuff Editor Dash は、文書をユーザーのブラウザまたはElectron環境に保存するローカルファースト設計です。IndexedDBのデータは、同じブラウザプロファイル・端末・オリジンでのみ利用できます。ブラウザデータの削除、別端末、シークレットモード、別ドメインへの移行では復元できない可能性があるため、重要な文書はエクスポートしてください。

> APIキーと文章を外部LLMへ送信するかどうかは、選択したプロバイダーおよびエンドポイントに依存します。外部サービスへ接続する前に、そのサービスの利用規約とデータ取扱方針を確認してください。

## アーキテクチャ

```text
packages/editor/
├── src/
│   ├── App.tsx                 # 編集画面、初回ガイド、レスポンシブ導線
│   ├── components/
│   │   ├── Landing/            # 公開ページ
│   │   ├── Editor/             # LexicalとMarkdown同期
│   │   ├── Chat/               # AIチャット
│   │   ├── ASM/                # Agent Skill Manager
│   │   ├── Gist/               # GitHub Gist連携（アップロード・ビューア）
│   │   ├── Preview/            # Markdownプレビュー（Alerts/Mermaid/ハイライト）
│   │   ├── Settings/           # テーマ・LLM・文体・メモリ・Gist設定（4タブ）
│   │   ├── Sidebar/            # 文書管理
│   │   ├── Terminal/           # アプリ内ターミナル（Electronはwterm、Webはモック）
│   │   └── Toolbar/            # 表示・保存・出力・Gist・mdv操作
│   ├── services/               # GitHub API クライアント
│   ├── stores/                 # Zustandの状態管理
│   └── utils/                  # IndexedDB、LLM、ファイル、mdv、Electron連携
├── electron/                   # Electronメイン（PTY・mdv起動IPC）・preload
├── public/wterm.wasm           # アプリ内ターミナルの描画用WASM
└── package.json
```

## 開発と検証

Web版の型検査と本番ビルドには次を実行します。

```bash
cd packages/editor
npm run build
```

Electron向けのコンパイルまで確認する場合は、次を実行します。

```bash
cd packages/editor
npm run electron:build
```

変更後は、ランディングページ、`/editor` への遷移、文書の作成・切替、リッチテキストとMarkdownの同期、保存状態、設定モーダルのEscapeキー終了を確認してください。

## 既知の制約と次の改善候補

- ブラウザ版の保存はローカルで完結し、同期・共同編集・履歴復元は提供していません。
- ASM、OSターミナル、mdv連携にはElectronとローカルの依存ツールが必要です。
- mdv連携はElectron版のみで、`mdv` がローカルにインストールされている必要があります。
- Web版のFile System Access APIはChrome/Edge系に限定されます（他ブラウザではダウンロード型の保存にフォールバック）。
- Viteのプロダクションビルドは、依存関係により大きいJavaScriptチャンクの警告を出す場合があります。今後は動的インポートによる分割を検討します。
- 既存のLexical JSON形式の古い保存データは、Markdown形式への手動移行が必要になる可能性があります。

## ライセンス

本リポジトリは [MIT License](./LICENSE) です。詳細はリポジトリ直下の `LICENSE` ファイルを参照してください。

## 関連ドキュメント

| 文書 | 内容 |
| --- | --- |
| [USAGE.md](./USAGE.md) | 詳しい利用手順 |
| [HISTORY.md](./HISTORY.md) | 更新履歴 |
| [DEV-MEMO.md](./DEV-MEMO.md) | 開発メモ |
| [README_ja.md](./README_ja.md) | 旧日本語READMEからの案内 |
