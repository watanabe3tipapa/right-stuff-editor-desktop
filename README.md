# right-stuff-editor-desktop

**日本語** | [English](./README.en.md)

**Markdown を、ワークスペースのまま。Apple Notes と AI を、ひとつの執筆環境へ。**

right-stuff-editor-desktop は、tinyjs（txiki.js + ネイティブ WebView）で構築した macOS 向けのローカルファースト・エディタです。ワークスペースのフォルダを開き、配下の Markdown をそのまま編集できます。リッチテキストの書き心地と Markdown の可搬性を両立し、Apple Notes の選択ノートも同じ画面で扱えます。

> **書く、整える、残す。その流れを、端末内で完結させる。** 原稿は選んだフォルダのファイルに残り、他のエディタ、Finder、Git とそのまま併用できます。クラウド同期やアカウント登録はありません。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-v0.1.0-blue.svg)](https://github.com/watanabe3tipapa/right-stuff-editor-desktop/releases)
[![Platform: macOS](https://img.shields.io/badge/platform-macOS-lightgrey.svg)](https://github.com/watanabe3tipapa/right-stuff-editor-desktop)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-live-blue.svg)](https://watanabe3tipapa.github.io/right-stuff-editor-desktop/)
[![GitHub issues](https://img.shields.io/github/issues/watanabe3tipapa/right-stuff-editor-desktop.svg)](https://github.com/watanabe3tipapa/right-stuff-editor-desktop/issues)

**クイックリンク:** [公開サイト](https://watanabe3tipapa.github.io/right-stuff-editor-desktop/) · [使い方](./docs/USAGE.md) · [開発メモ](./docs/DEV-MEMO.md) · [Issues](https://github.com/watanabe3tipapa/right-stuff-editor-desktop/issues) · [Releases](https://github.com/watanabe3tipapa/right-stuff-editor-desktop/releases)

## ダウンロード

v0.1.0 は現在、ソースからのビルドを前提としています。配布用ビルドは GitHub Releases で公開予定です。

> ビルドは ad-hoc 署名です。Apple Developer ID 署名・公証は行っていません。初回起動時に警告が出た場合は、アプリを右クリック →「開く」を選択してください。

## コンセプト

### なぜ「Desktop」なのか

ブラウザ完結のエディタは手軽ですが、原稿の保存先はブラウザのストレージに閉じます。Desktop 版はその制約を外し、**ユーザーが選んだフォルダを原稿の保存先**にしました。アプリを閉じてもファイルはそこに残り、既存のワークフローからそのまま扱えます。

| 体験 | right-stuff-editor-desktop の対応物 |
|---|---|
| 書く | Lexical ベースのリッチテキスト編集（見出し・リスト・引用・表・リンク・コード） |
| 確かめる | Markdown ソースとリッチテキストの切替、強化プレビュー |
| 残す | ワークスペースの Markdown へ直接自動保存 |
| 守る | atomic write、外部変更の競合検知、履歴、リカバリ、バックアップ |
| つなぐ | Apple Notes の閲覧・編集、GitHub Gist 連携 |
| 整える | AI 補完、インライン変換、AI チャット、文体プロファイル |
| 持ち出す | Markdown / HTML / JSON / TXT / DOCX / Ollama Modelfile へ保存 |

### 設計方針

1. **ファイルが主役** — アプリ独自のデータベースを原稿の正とせず、ローカルの Markdown を直接読み書きする
2. **保存を見える化** — 保存中・保存済み・未保存・競合をステータスバーに表示する
3. **端末内で完結** — アカウント、テレメトリ、クラウド同期を持たない
4. **壊さない** — 一時ファイル + rename の atomic write、ハッシュと mtime による競合検知、削除時のゴミ箱退避

## 主な特徴

### 機能

- **ワークスペース** — フォルダを選択すると配下の Markdown / TXT を再帰的に一覧表示。作成・名前変更・削除・再読み込みに対応
- **リッチテキスト編集** — 見出し、太字、斜体、下線、取り消し線、文字色、ハイライト、リスト、チェックリスト、引用、コードブロック、リンク、表
- **Markdown 同期** — 編集内容を frontmatter 付き Markdown として保存し、ソース表示とプレビューへ反映
- **自動保存と競合解決** — 既定 30 秒間隔で保存。外部変更を検出した場合は再読み込みを促す
- **バージョン履歴** — 保存のたびに直前の内容を SQLite へ記録し、任意の版をプレビュー・復元
- **リカバリ** — 未保存内容を 15 秒ごとにスナップショット。次回起動時に復元を提案
- **バックアップ** — ワークスペース全体を JSON または Markdown で `.right-stuff/backups` へ定期保存
- **Apple Notes** — フォルダ・ノート一覧、本文の読み取りと直接更新。ロック・共有ノートは読み取り専用
- **強化プレビュー** — GitHub Alerts、Mermaid、KaTeX、シンタックスハイライト、GFM
- **AI アシスタント** — 18 種のプロバイダー、ゴーストテキスト、スラッシュコマンド、選択テキストのインライン変換、AI チャット
- **文体・記憶** — 文体プロファイルとエンティティメモリで、固有名詞の表記を一貫させる
- **ターミナル** — macOS の PTY を wterm で表示。ワークスペースをカレントディレクトリとして起動
- **執筆支援 UI** — テンプレート、コマンドパレット、検索、執筆統計、Zen モード、タイプライターモード
- **テーマ** — Light / Dark / System
- **書き出し** — OS の保存パネルから Markdown / HTML / JSON / TXT / DOCX / Ollama Modelfile。PDF は印刷ダイアログ経由

### アーキテクチャ

- **フロントエンド**: Vite + React 18 + Lexical 0.32
- **スタイリング**: Tailwind CSS v4（`@tailwindcss/vite`）
- **デスクトップ基盤**: tinyjs（txiki.js バックエンド + ネイティブ WebView）
- **バックエンド**: Tiny API ハンドラー、ワークスペース I/O、SQLite、Apple Notes ブリッジ、PTY
- **データベース**: `tjs:sqlite`（WAL）。設定、履歴、リカバリ、執筆統計、テンプレート、チャットを保存
- **ブリッジ**: `window.tiny` を薄くラップした `src/frontend/utils/desktop.ts`
- **パッケージ**: `tinyjs build` + `scripts/postbuild-macos.sh`（Apple Events 用途の追加と ad-hoc 署名）

### データとセキュリティ

- 原稿はワークスペースの Markdown ファイルとして保存され、外部サーバーへ送信されません
- アカウント登録、テレメトリ、クラウド同期はありません
- Apple Notes へのアクセスは macOS の自動化権限を使用し、選択したノートのみを読み書きします
- AI 機能は、設定したプロバイダーへ明示的に接続した場合だけ動作します
- API キーはアプリのローカル設定として保持されます
- ワークスペース外へのパスはバックエンドで検証し、`.right-stuff` 配下への直接アクセスを拒否します

## インストールとビルド

### 前提条件

| ツール | 必要バージョン | 確認コマンド |
|---|---:|---|
| macOS | 15 以降（Apple Silicon） | `sw_vers` |
| Node.js | >= 20 | `node --version` |
| tinyjs | >= 0.60 | `tinyjs --version` |

tinyjs は [公式サイト](https://tinyjs.app/) の手順でインストールしてください。アプリ内ターミナルには `/usr/bin/python3` を使用します（Command Line Tools に含まれます）。

### 基本的な手順

1. リポジトリを取得

```bash
git clone https://github.com/watanabe3tipapa/right-stuff-editor-desktop.git
cd right-stuff-editor-desktop
```

2. 依存をインストール

```bash
npm ci
```

3. ネイティブウィンドウで起動

```bash
tinyjs dev
```

Vite は `http://127.0.0.1:3000` で起動し、tinyjs がネイティブウィンドウで読み込みます。初回は既定のワークスペース（`~/Documents/Right-Stuff`）が作成されます。

4. アプリをビルド

```bash
npm run package
open "dist/Right-Stuff Editor Desktop.app"
```

`npm run package` は `tinyjs build` の後に macOS 用の後処理を行います。Apple Notes 連携にはこの手順を使用してください。フロントエンドのみのビルドは `npm run build` です。

### 主要コマンド

| コマンド | 用途 |
|---|---|
| `tinyjs dev` | ネイティブウィンドウで開発起動（HMR） |
| `npm run dev` | Vite 開発サーバーのみ起動 |
| `npm run build` | 型検査 + フロントエンドを `dist/` へビルド |
| `npm run build:landing` | ランディングページを `site/` へビルド |
| `npm run typecheck` | TypeScript の型検査 |
| `npm run lint` | oxlint による静的解析 |
| `npm test` | Vitest によるユニットテスト |
| `npm run package` | macOS アプリ（`.app`）をビルドし、署名を後処理 |
| `npm run applefm` | Apple Foundation Models ブリッジをビルド・起動 |

## 公開

ランディングページは `main` ブランチへの push を契機に [GitHub Actions](./.github/workflows/pages.yml) がビルドし、GitHub Pages で公開します。

| パス | 内容 |
|---|---|
| `/` | ランディングページ（`src/landing/`） |
| `assets/` | LP 用の CSS / JavaScript |
| `favicon.*` / `site.webmanifest` | アイコンと PWA メタデータ |

アプリ本体は Web 配信しません。macOS 向けビルドを GitHub Releases で配布する想定です（v0.1.0 時点ではビルド手順のみ）。

- ランディングページ: `site/`
- アプリパッケージ: `dist/Right-Stuff Editor Desktop.app`
- 署名: ad-hoc
- 対応アーキテクチャ: arm64

## ディレクトリ構成

```text
src/
├── backend/                        # txiki.js バックエンド
│   ├── main.ts                     # Tiny API ハンドラー / 初期化
│   ├── workspace.ts                # ワークスペース I/O・競合検知・バックアップ
│   ├── db.ts                       # SQLite（設定・履歴・統計・テンプレート・チャット）
│   ├── notes-bridge.ts             # Apple Notes AppleScript 連携
│   ├── terminal.ts                 # Python PTY ブリッジ
│   └── markdown.ts                 # frontmatter 解析・生成
├── frontend/                       # WebView フロントエンド
│   ├── App.tsx                     # レイアウト、保存、リカバリ
│   ├── components/                 # Editor / Preview / Notes / Chat / Settings ほか
│   ├── stores/                     # Zustand の状態管理
│   └── utils/                      # desktop ブリッジ、Markdown、LLM
├── landing/                        # GitHub Pages 用ランディングページ
│   ├── index.html
│   ├── main.tsx
│   └── landing.css
└── shared/types.ts                 # バックエンドとフロントエンドの共有型

applefm/                            # Apple Foundation Models Swift ブリッジ
scripts/postbuild-macos.sh          # Info.plist と ad-hoc 署名
public/                             # favicon、OG 画像、wterm.wasm
docs/                               # 使い方・開発メモ
.github/workflows/pages.yml         # GitHub Pages デプロイ
tinyjs.json                         # tinyjs アプリ設定
vite.landing.config.ts              # LP ビルド設定
package.json
```

## 使い方

1. 起動後、サイドバーのフォルダ名からワークスペースを選択します
2. 「＋」で新規文書を作成するか、一覧から Markdown を開きます
3. ツールバーで書式を整え、必要なら Markdown / プレビューへ切り替えます
4. 編集内容は自動保存されます。手動保存は `⌘S`
5. 履歴ボタンから過去の版を確認・復元できます
6. Notes ボタンから Apple Notes のフォルダとノートを開き、そのまま編集できます
7. 書き出したいときはツールバーのエクスポートから形式を選択します

## 既知の制約とロードマップ

### v0.1.0

- [x] tinyjs プロジェクトへの移行、ネイティブウィンドウ表示
- [x] Lexical によるリッチテキスト編集と Markdown 同期
- [x] ワークスペースの Markdown 一覧・作成・名前変更・削除
- [x] atomic write、外部変更の競合検知、ゴミ箱退避
- [x] 自動保存、バージョン履歴、リカバリ、定期バックアップ
- [x] Apple Notes の一覧・読み取り・保存
- [x] 強化プレビュー（Alerts / Mermaid / KaTeX / highlight）
- [x] AI 補完・インライン変換・チャット・文体プロファイル
- [x] macOS PTY ターミナル
- [x] テンプレート、執筆統計、コマンドパレット、テーマ
- [x] Markdown / HTML / JSON / TXT / DOCX / Ollama Modelfile 書き出し
- [x] Vitest による Markdown / Notes 往復テスト

### 次の候補

- [ ] Apple Developer ID 署名・公証を含む配布パイプライン
- [ ] Universal ビルド（Intel Mac 対応）
- [ ] ネイティブ PDF 書き出し
- [ ] Apple Notes のチェックリスト・添付ファイルの往復精度向上
- [ ] Agent Skill Manager / mdv 連携の再有効化
- [ ] Windows / Linux 向けビルド

### 制約

- 現在の対象は macOS です。配布パッケージは arm64 のみです
- アプリ内ターミナルは macOS + `/usr/bin/python3` が必要です
- Apple Notes 連携には macOS の自動化権限が必要です。共有・ロック済みノートは読み取り専用になります
- PDF 書き出しは印刷ダイアログ経由です
- 同期・共同編集は提供していません
- アプリ本体の Web 配信は行いません（公開するのはランディングページのみです）

## ドキュメント

1. [USAGE.md](./docs/USAGE.md) — セットアップ、操作、トラブルシューティング
2. [DEV-MEMO.md](./docs/DEV-MEMO.md) — 実装の経緯・技術判断・検証記録
3. [README（English）](./README.en.md) — English overview
4. [README（docs）](./docs/README.md) — 機能の詳細

## コントリビューション

コントリビューションは歓迎します。大きな変更を行う前に [Issue](https://github.com/watanabe3tipapa/right-stuff-editor-desktop/issues) を立てて相談してください。一般的な手順:

1. リポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/your-feature`)
3. 変更をコミット (`git commit -m 'Add your feature'`)
4. ブランチをプッシュし、Pull Request を作成

## 連絡先

- GitHub: https://github.com/watanabe3tipapa/right-stuff-editor-desktop
- Issues: https://github.com/watanabe3tipapa/right-stuff-editor-desktop/issues

## ライセンス

MIT ライセンス — 詳細はリポジトリの [LICENSE](LICENSE) ファイルを参照してください。

RIGHT-STUFF EDITOR は個人プロジェクトです。tinyjs、txiki.js、Lexical、Tailwind CSS はそれぞれのライセンスに従います。
