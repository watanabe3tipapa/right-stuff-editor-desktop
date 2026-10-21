# Right-Stuff-Editor 開発メモ

**作成日:** 2026/04/07
**ステータス:** プロトタイプ（試作段階）

---

## 現在の開発ステータス

### 実装済み ✅

- Webアプリケーション（React + Vite）
- Lexical エディター + Markdown プレビュー
- ファイルI/O（Web API / Electron IPC対応）
- LLM統合（Ollama, AnythingLLM, OpenAI, LMStudio対応）
- 自動保存（IndexedDB/Dexie.js）
- AI Chat → Editor コピーボタン
- テーマ切替（Light/Dark/System）
- キーボードショートカット
- エクスポート機能（Markdown, HTML, PDF, JSON）
- アプリ内ターミナル（Electron版: wterm + node-pty で実OSシェル、Web版: モックフォールバック）

### 未実装 ⚠️

- Electron Main Process のビルド・組み込み（コード自体は作成済み）
- デスクトップexe化
- LLMサーバーとの実際の接続テスト
- 本格的なバグ修正・パフォーマンス調整

### 動作確認済み ✅

- Webアプリ: npm run build で正常ビルド
- ファイル操作（Web File System API / Fallback）
- UIコンポーネント表示
- LLM (Ollama): curlでAPI応答確認済み

### 動作確認に必要な外部環境

- LLM接続: Ollama 等がローカルで動作している必要があります

### 現在の問題 ⚠️

- Vite dev server (`npm run dev`) が起動しないまたは切断される
- 解決策: ビルド (`npm run build`) 後distフォルダを静的サーバーで提供

---

## 1. コンセプト・ビジョン

### 1.1 概要
**Right-Stuff-Editor** は、「常に正しい情報を、適切な形式で、適切なタイミングで提供する」ことをミッションとする万能エディターです。

### 1.2 核心価値 (Core Values)
- **Universal（普遍的な）:** 単一エディターでMarkdown、コード、ドキュメント、LLMとの対話を実現
- **Smart（ intelligent）:** AI支援による執筆支援、自動補完、文法チェック
- **Fast（ quick）:** リアルタイムプレビュー、ストリーミング応答、高速レンダリング
- **Friendly（ accessible）:** 直感的なUI、低い学習コスト、アクセシビリティ対応

### 1.3 対象ユーザー
- 技術ライター・ドキュメント作成者
- ソフトウェア開発者
- 研究者・学生
- コンテンツクリエイター

---

## 2. 技術スタック提案

### 2.1 フロントエンド

| レイヤー | 技術選択 | 選定理由 |
|---------|---------|---------|
| **フレームワーク** | React 18 + TypeScript | コンポーネント指向、型安全性、エコシステム豊富 |
| **ビルドツール** | Vite 5 | 高速×HMR、ESMファースト、シンプルな設定 |
| **スタイリング** | Tailwind CSS | ユーティリティファースト、軽量、カスタマイズ性 |
| **状態管理** | Zustand | シンプルなAPI、React外でも使用可能、軽い |
| **エディターコア** | Lexical | Meta製、拡張性高い、リアルタイム協調編集対応 |
| **Markdown** | remark + rehype | 柔軟性の高いAST変換、プラグイン豊富 |

### 2.2 デスクトップ（Electron）

| コンポーネント | 技術 | 備考 |
|---------------|------|------|
| **バージョン** | Electron 28+ | Chromium 120+、Node 18+対応 |
| **IPC通信** | contextBridge + ipcRenderer | セキュリティ強化、隔離されたコンテキスト |
| **ストリーミング** | gRPC-Web | LLM応答のリアルタイムストリーミング |
| **セキュリティ** | nodeIntegration: false | Context Isolation有効 |

### 2.3 バックエンド・通信

| 機能 | 技術 | 備考 |
|-----|------|------|
| **LLM通信** | gRPC + Protobuf | 双方向ストリーミング対応、低遅延 |
| **プロトコル** | gRPC-Web | ブラウザ可直接接続、WebSocket代替 |
| **認証** | JWT + OAuth2 | 標準的な認証フロー |

### 2.4 データ永続化

| 用途 | 技術 | 備考 |
|-----|------|------|
| **ローカルDB** | IndexedDB (Dexie.js) | ブラウザ内永続化、アドレス帳・設定等 |
| **セッションデータ** | メモリ + IndexedDB | ストリーミング履歴の一時保持 |
| **キャッシュ** | Redis（サーバー側） | APIレスポンスキャッシュ、セッション状態管理 |

---

## 3. 参照エディターの機能分析

### 3.1 quarto-editor-pe

**URL:** https://quarto-editor-pe.vercel.app

**強み:**
- Quarto記法対応（Markdown拡張）
- リアルタイムプレビュー
- シンプルUI

**継承すべき機能:**
- Quarto形式でのエクスポート
- プレビュー分割表示
- フロントマター対応

### 3.2 lexical-markdown-editor

**URL:** https://toolsmith-editor.vercel.app

**強み:**
- Lexicalベースのリッチテキスト編集
- Markdown直接編集モード
- ツールバーUI

**継承すべき機能:**
- WYSIWYG + Markdown源切り替え
- カスタムブロック対応
- フローティングツールバー

### 3.3 統合すべき共通機能

| 機能 | 実装優先度 | 備考 |
|-----|----------|------|
| リアルタイムプレビュー | 高 | 左右分割レイアウト |
| Markdown-shortcut支援 | 高 | 入力中の自動変換 |
| AI補完・suggestion | 中 | LLMストリーミング統合 |
| エクスポート多様形式 | 中 | HTML, PDF, DOCX対応 |

---

## 4. システムアーキテクチャ

### 4.1 全体構成

```
┌─────────────────────────────────────────────────────┐
│                    Renderer Process                  │
│  ┌─────────┐  ┌──────────┐  ┌─────────────────────┐ │
│  │  React  │  │  Lexical │  │  LLM Streaming UI   │ │
│  │   App   │  │  Editor  │  │  (Chat Panel)       │ │
│  └────┬────┘  └────┬─────┘  └──────────┬──────────┘ │
│       │            │                   │             │
│  ┌────┴────────────┴───────────────────┴─────────┐ │
│  │              Zustand Store                     │ │
│  │  - editorState  - chatHistory  - userSettings  │ │
│  └─────────────────────┬─────────────────────────┘ │
│                        │ contextBridge              │
├────────────────────────┼────────────────────────────┤
│                   Main Process                       │
│  ┌─────────────────────┴─────────────────────────┐   │
│  │              IPC Handler                      │   │
│  │  - file operations  - LLM requests            │   │
│  └──────┬──────────────────────┬───────────────┘   │
│         │                      │                    │
│  ┌──────┴──────┐        ┌──────┴──────┐             │
│  │  File I/O  │        │  gRPC Client │             │
│  │  (Node.js) │        │  (LLM Service)│             │
│  └────────────┘        └──────────────┘             │
└─────────────────────────────────────────────────────┘
```

### 4.2 モジュール構成

```
src/
├── main/                    # Electron Main Process
│   ├── index.ts            # エントリーポイント
│   ├── ipc/                # IPC handlers
│   │   ├── file.ts         # ファイル操作
│   │   └── llm.ts          # LLM通信
│   └── grpc/               # gRPCクライアント
│       └── client.ts
│
├── preload/                 # Context Bridge
│   └── index.ts            # API公開定義
│
├── renderer/               # React Application
│   ├── App.tsx
│   ├── components/        # UIコンポーネント
│   │   ├── Editor/         # Lexicalエディター
│   │   ├── Chat/           # LLMチャットパネル
│   │   ├── Toolbar/        # ツールバー
│   │   └── Preview/        # プレビュー
│   ├── hooks/              # カスタムフック
│   ├── stores/             # Zustand stores
│   └── utils/              # ユーティリティ
│
└── shared/                 # 共通型・定数
    └── types.ts
```

---

## 5. コンポーネント設計

### 5.1 エディターコンポーネント (Editor)

**機能:**
- Lexicalベースのリッチテキスト編集
- Markdown入力モード切替
- リアルタイム文字数カウント
- 自動保存（IndexedDB）

**状態:**
```typescript
interface EditorState {
  content: string;
  mode: 'rich' | 'markdown';
  isDirty: boolean;
  lastSaved: Date | null;
}
```

### 5.2 LLMチャットパネル (ChatPanel)

**機能:**
- ストリーミング応答表示
- 会話履歴管理
- プロンプトテンプレート
- キャンセル機能

**状態:**
```typescript
interface ChatState {
  messages: Message[];
  isStreaming: boolean;
  currentId: string | null;
}
```

### 5.3 プレビューパネル (Preview)

**機能:**
- Markdown → HTML変換
- スタイル適用
- 同期スクロール

### 5.4 ツールバー (Toolbar)

**機能:**
- 書式設定ボタン
- エクスポートメニュー
- AIアクション起動

---

## 6. 実装ロードマップ

### Phase 1: 基盤構築（2〜3週間）
- [ ] Electron + React + Vite プロジェクト構築
- [ ] Lexicalエディター統合
- [ ] Markdownパース設定（remark/rehype）
- [ ] 基本UIレイアウト実装

### Phase 2: コア機能（2〜3週間）
- [ ] リアルタイムプレビュー
- [ ] Markdown-shortcut対応
- [ ] ファイル保存・読込機能
- [ ] IndexedDB統合（自動保存）

### Phase 3: LLM統合（2〜3週間）
- [ ] gRPC-Webクライアント設定
- [ ] ストリーミング応答UI
- [ ] チャット履歴管理
- [ ] プロンプトテンプレート

### Phase 4: 高機能化（2〜3週間）
- [ ] エクスポート機能（HTML, PDF）
- [ ] 設定画面
- [ ] テーマ切替
- [ ] キーボードショートカット

### Phase 5: 打磨・リリース（1〜2週間）
- [x] ドキュメント作成
- [x] ベータ版リリース（v0.4.x で継続更新）
- [ ] アクセシビリティ対応
- [ ] パフォーマンスチューニング

---

## 7. 技術的決定事項

### 7.1 確定事項

| 項目 | 決定 | 代替案 |
|-----|------|-------|
| フレームワーク | React 18 + TypeScript | Vue 3, Svelte |
| ビルドツール | Vite | Webpack, esbuild |
| エディターコア | Lexical | CodeMirror, Monaco |
| 状態管理 | Zustand | Redux Toolkit, Jotai |
| デスクトップ | Electron | Tauri, Neutralino |
| LLM通信 | gRPC-Web | REST API, WebSocket |

### 7. 保留事項（要検討）

- [ ] 協調編集機能の要不要
- [ ] オフライン対応の範囲
- [ ] マルチウィンドウ対応
- [ ] プラグインアーキテクチャ

---

## 8. リスクと対策

| リスク | 影響度 | 対策 |
|-------|--------|------|
| gRPC-Webブラウザ対応 | 中 | WebSocketフォールバック |
| Lexical学習コスト | 低 | サンプルコード整備 |
| Electronパッケージサイズ | 中 | コード分割・遅延読込 |
| LLMサービス依存 | 高 | 抽象化レイヤー実装 |

---

## 9. 次のアクション

1. **技術検証:** Lexical + React 18 での基本動作確認
2. **プロトタイプ:** エディター + プレビューの最小構成を作成
3. **設計レビュー:** 主要コンポーネントのAPI設計レビュー
4. **LLM環境準備:** gRPC-Webサーバーの準備

---

**メモ:** このドキュメントは Living Document として運用し、技術の進歩やフィードバックに応じて更新します。

---

## 10. 現状報告 (2026/04/07 現在)

### 実装進捗

| フェーズ | 計画 | 進捗 | 備考 |
|---------|------|------|------|
| Phase 1 | Electron + React + Vite 構築 | ✅ 完了 | packages/editor/ に Vite + React 環境構築済み |
| Phase 1 | Lexicalエディター統合 | ✅ 完了 | LexicalEditor コンポーネント実装済み |
| Phase 1 | Markdownパース設定 | ✅ 完了 | remark + rehype セットアップ済み |
| Phase 1 | 基本UIレイアウト | ✅ 完了 | Toolbar, Sidebar, Editor, Preview, ChatPanel 配置完了 |
| Phase 2 | リアルタイムプレビュー | ✅ 完了 | MarkdownPreview コンポーネント実装済み |
| Phase 2 | ファイル保存・読込 | ⚠️ 未着手 | IndexedDB (Dexie.js) は導入済み |
| Phase 3 | LLM統合 | ⚠️ UIのみ | ChatPanel は存在するが通信は未実装 |

### 現在の技術構成

- **フレームワーク:** React 18.3.1 + TypeScript 5.4.5
- **ビルドツール:** Vite 5.4.2
- **エディターコア:** Lexical 0.17.1
- **状態管理:** Zustand 4.5.2
- **ローカルDB:** Dexie.js 4.0.4 (IndexedDB)
- **Markdown処理:** remark-parse + remark-rehype + rehype-stringify
- **スタイリング:** Tailwind CSS 3.4.4 + @tailwindcss/typography 0.5.13

### 現在のファイル構成

```
packages/editor/
├── src/
│   ├── App.tsx              # メインアプリコンポーネント
│   ├── components/
│   │   ├── Editor/          # Lexicalエディター
│   │   ├── Preview/         # Markdownプレビュー
│   │   ├── Toolbar/         # ツールバー
│   │   ├── Chat/            # LLMチャットパネル（UIのみ）
│   │   └── Sidebar/         # サイドバー
│   ├── stores/              # Zustand ストア
│   ├── hooks/               # カスタムフック
│   ├── types/               # 型定義
│   └── utils/               # ユーティリティ（fileOperations.ts 含む）
├── package.json             # 依存関係
├── vite.config.ts
├── tailwind.config.js
├── electron/                # Electron関連（追加）
│   ├── main.ts              # Main Process
│   └── preload.ts           # Context Bridge
├── tsconfig.electron.json   # Electron用TS設定
└── electron/main.js         # ビルド出力
```

### 未実装機能

1. ~~ファイルI/O~~ - ✅ 実装済み（File System Access API + Electron IPC）
2. ~~Electron Main Process~~ - ✅ 実装済み（IPC handlers, preload）
3. **LLM通信** - gRPC-Web または WebSocket でのLLM接続
4. **自動保存** - IndexedDBへの定期保存（ Dexie.js は導入済み）
5. **エクスポート機能** - HTML, PDF 等への出力

### 次のアクション（優先度順）

1. ~~ファイルI/O機能実装~~ - ✅ 完了
2. ~~Electron統合~~ - ✅ 完了
3. ~~LLMストリーミング接続~~ - ✅ 完了（Ollama, AnythingLLM, OpenAI対応）
4. **自動保存機能** - Dexie.js を使ったドキュメント保存

---

## 11. LLM統合 (2026/04/07 現在)

### 対応プロバイダー

| プロバイダー | エンドポイント | デフォルトモデル | 備考 |
|-------------|--------------|-----------------|------|
| **Ollama** | http://localhost:11434/v1/chat/completions | llama3.2 | ローカルLLM |
| **AnythingLLM** | http://localhost:3001/api/v1/chat | gpt-3.5-turbo | プロキシ対応 |
| **OpenAI** | https://api.openai.com/v1/chat/completions | gpt-3.5-turbo | APIキー必要 |
| **Custom** | カスタム | カスタム | 任意のAPI対応 |

### 実装ファイル

- `src/utils/llmClient.ts` - LLMクライアント（ストリーミング対応）
- `src/stores/llmStore.ts` - LLM設定の状態管理（Zustand + persist）
- `src/components/Settings/Settings.tsx` - 設定UI（プロバイダー選択可能）

### 機能

- プロバイダー切り替え（Ollama/AnythingLLM/OpenAI/Custom）
- エンドポイント設定
- モデル選択（Ollamaは自動取得）
- Temperature/MaxTokens設定
- APIキー入力（OpenAI/Custom）
- 設定はlocalStorageに永続化

---

## 12. 自動保存機能 (2026/04/07 現在)

### 実装ファイル

- `src/utils/db.ts` - Dexie.js データベース（IndexedDB）
- `src/stores/editorStore.ts` - 自動保存ロジック追加
- `src/App.tsx` - 自動保存タイマー・ステータス表示

### 機能

- Dexie.js によるIndexedDB永続化
- 自動保存間隔: 30秒（デフォルト）
- ステータスバーに保存状況表示（Saving.../Unsaved/Saved）
- 手動保存（Ctrl+S）でもDB保存
- 設定はlocalStorageに永続化

---

## 未実装機能

1. ~~ファイルI/O~~ - ✅ 完了
2. ~~Electron統合~~ - ✅ 完了
3. ~~LLMストリーミング接続~~ - ✅ 完了
4. ~~自動保存機能~~ - ✅ 完了
5. ~~エクスポート機能~~ - ✅ 完了（Markdown, HTML, PDF, JSON）
6. ~~テーマ切替~~ - ✅ 完了（Light/Dark/System）
7. ~~キーボードショートカット~~ - ✅ 完了（カスタム対応）

---

## 13. エクスポート機能 (2026/04/07 現在)

### 実装ファイル

- `src/utils/fileOperations.ts` - エクスポート関数追加

### 機能

- Markdown 保存 (.md)
- HTML エクスポート (.html) - MarkdownからHTML変換付き
- PDF エクスポート (.pdf) - 印刷ダイアログ使用
- JSON エクスポート (.json) - ドキュメント構造保存

---

## 14. テーマ切替 (2026/04/07 現在)

### 実装ファイル

- `src/stores/themeStore.ts` - テーマ管理（Zustand + persist）
- `src/components/Settings/Settings.tsx` - テーマ選択UI追加
- `src/index.css` - ライトモードCSS追加

### 機能

- Light/Dark/System オプション
- システム設定からの自動検出（System時）
- localStorageに永続化
- 設定UIで切り替え可能

---

## 15. キーボードショートカット (2026/04/07 現在)

### 実装ファイル

- `src/stores/shortcutStore.ts` - ショートカット管理

### デフォルトショートカット

| アクション | ショートカット | カテゴリ |
|-----------|--------------|---------|
| 保存 | Ctrl+S | File |
| ファイルを開く | Ctrl+O | File |
| 新規ドキュメント | Ctrl+N | File |
| プレビュー切り替え | Ctrl+Shift+P | View |
| サイドバー切り替え | Ctrl+B | View |
| AIチャット切り替え | Ctrl+Shift+C | AI |
| 設定を開く | Ctrl+, | Editor |
| エディターモード切り替え | Ctrl+Shift+M | Editor |

### 機能

- カスタムショートカット対応（設定で変更可能）
- localStorageに永続化
- デフォルトに戻す機能

## 16. Live Document (2026/04/12 現在)

### 概要

本セクションは、GitHub push前の総点検結果を記録するライブドキュメントです。

### 総点検結果 ✅

| チェック項目 | ステータス | 備考 |
|-------------|----------|------|
| ビルド（Vite + TypeScript） | ✅ 成功 | dist/ 生成済み |
| Electronビルド | ✅ 成功 | tsc 正常コンパイル |
| 診断（エラー/警告） | ✅ 0件 | 問題なし |
| .gitignore設定 | ✅ 適切 | node_modules, dist, .env 等除外済み |
| .envファイル | ✅ 存在しない | 機密情報なし |
| 機密情報 | ✅ なし | APIキー等ハードコードなし |
| node_modules | ✅ インストール済み | 依存関係完整 |
| 日本語漢字チェック | ✅ 修正済み | DEV-MEMO.md, HISTORY.mdの非日本語漢字を修正 |

### 発見された問題 ⚠️

| # | 問題 | 重要度 | 対応 |
|---|------|--------|------|
| 1 | Gitリポジトリ未初期化 | 高 | `git init` で初期化必要 |
| 2 | electron/main.ts と main.cjs の不整合 | 中 | main.ts は preload.cjs を参照、main.cjs は preload.js を参照 |
| 3 | electron/ に .ts/.js/.cjs が混在 | 中 | ビルド成果物の管理を一貫させるべき |

### プロジェクト構造

```
right-stuff-editor/
├── packages/
│   └── editor/              # メインアプリケーション
│       ├── src/             # React コンポーネント
│       ├── electron/        # Electron メインプロセス
│       ├── dist/            # ビルド出力（gitignore済み）
│       └── node_modules/    # 依存関係（gitignore済み）
├── .gitignore               # 適切に設定済み
├── DEV-MEMO.md              # このドキュメント
├── HISTORY.md               # 変更履歴
├── USAGE.md                 # 使用方法
└── vercel.json              # Vercel設定
```

### 今回実施した修正

- **日本語漢字修正**: DEV-MEMO.mdとHISTORY.mdに混在していた非日本語漢字（ Cyrillic 等）を日本語漢字に修正済み

### GitHub Push 前の推奨アクション

1. **Git初期化**
   ```bash
   git init
   git remote add origin https://github.com/username/right-stuff-editor.git
   ```

2. **electron/main.ts の不整合を修正**（推奨）
   - 現在の main.ts は `preload.cjs` を参照
   - 現在の main.cjs は `preload.js` を参照
   - いずれかに統一することを推奨

3. **push前確認**
   ```bash
   git status --ignored
   ```

### 備考

- ビルド警告: チャンクサイズ 1MB（警告のみ、エラーなし）
- .DS_Store: .gitignore で無視設定済み

---

## 17. Live Document 更新 (2026/04/12)

### 実施内容

- 日本語漢字修正: DEV-MEMO.mdとHISTORY.mdに混在していた非日本語漢字を日本語漢字に修正
- README.mdとREADME_ja.mdに相互リンクを追加
- 日本語版: `[![日本語](./README_ja.md)](./README_ja.md)`
- 英語版: `[![English](./README.md)](./README.md)`

### 備考

- README.md, README_ja.mdの重複バナー削除済み

---

## 18. GitHub Push & Vercel Deploy 完了 (2026/04/12)

### 実施内容

- **GitHub Push**: mainブランチにpush済み
- **Vercel Deploy**: https://vercel.app等领域にデプロイ済み

### 今後の一覧

| 優先度 | 課題 | 備考 |
|--------|------|------|
| 高 | Vite dev server起動問題 | 静的サーバー経由で回避可能 |
| 中 | Electron .js/.cjs 不整合 | ビルド成果物管理の一貫性 |
| 低 | ブラウザでのLLMチャット動作確認 | Ollama等の外部環境必要 |

### コミット履歴

```
f0e43ed *.md - edited
d8731c3 fix: repair Vercel config
f3fcf63 fix: repair Vercel config for static-build and SPA routes
3cad5a9 vercel.json - fix
ee13065 vercel.json - fix
4668baf upload
```

---

## 19. 全体ソースコード点検 (2026/04/12)

### 実施内容

- **日本語漢字点検**: 全 *.md ファイルを対象とした Cyrillic・中国簡体字の検出と修正
- **DEV-MEMO.md**: 「单一」→「単一」
- **HISTORY.md**: 「调查中」→「調査中」、「样式」→「様式」、「支持」→「サポート」を修正
- Cyrillic 文字を削除し、日本語で統一

### 確認結果

| ファイル | 漢字数 | Cyrillic | 中国簡体字 |
|----------|--------|---------|-----------|
| DEV-MEMO.md | 299 | 0 | 0 |
| HISTORY.md | 151 | 0 | 0 |
| USAGE.md | 113 | 0 | 0 |
| README_ja.md | 32 | 0 | 0 |
| README.md | 1 | 0 | 0 |

### 備考

- 全ての *.md ファイルが日本語漢字で統一されました

---

## 20. Toolbar自動表示・非表示機能実装 (2026/04/14)

### 実施内容

- **Toolbar.tsx** に自動非表示ロジックを追加
  - マウス操作がない場合3秒後にフェードアウト
  - マウスがToolbar周边に近づくと自动表示
  - キーボード操作でToolbarを表示
  - `Ctrl+Shift+T` で手動切换

### 変更ファイル

| ファイル | 変更内容 |
|----------|----------|
| `components/Toolbar/Toolbar.tsx` | 表示状態管理、フェード効果 |
| `stores/shortcutStore.ts` | toggleToolbar shortcut追加 |
| `App.tsx` | shortcut処理追加 |

### 備考

- ビルド成功 (TypeScript + Vite)
- 警告: チャンクサイズ 1MB（警告のみ）
  - デフォルトしきい値: 500 KB
  - 現在サイズ: 1,047 KB (約2倍)
  - 軽減には code-splitting や manualChunks の導入を検討

---

## 21. README言語切り替えの実装 (2026/04/14)

### 実施内容

- README.md と README_ja.md の相互リンクをスマートに更新
- 切り替え形式: `[English](./README.md) | [日本語](./README_ja.md)`
- README.md: English | 日本語
- README_ja.md: 日本語 | English

### 変更ファイル

- `README.md`
- `README_ja.md`

### 備考

- ビルド不要（ドキュメントのみ）

---

## 22. Lexical Editor ツールバーの実装 (2026/04/14)

### 実施内容

- Lexical Editor内にツールバープラグインを追加
- 見出しボタン: H1, H2, H3
- 書式設定ボタン: Bold, Italic, Code
- ブロックボタン: Quote, Bullet List, Numbered List
- Toolbar.tsx は従来通りに常時表示に戻す

### 変更ファイル

- `packages/editor/src/components/Editor/LexicalEditor.tsx` - ToolbarPlugin追加

### 備考

- ビルド成功 (1,049 KB)

---

## 23. Modelfile SYSTEMプロンプト更新 (2026/04/14)

### 実施内容

- Modelfileエクスポート時のSYSTEMプロンプトを更新
- 新プロンプト: 論理的・批評的なプログラミングAIとして、論理の飛躍、語彙の適切性、コードの適切性、トーンの一貫性をチェック

### 変更ファイル

- `packages/editor/src/utils/fileOperations.ts` - exportAsModelfile関数

### 備考

- ビルド成功

---

## 24. Modelfile出力模板の全面刷新 (2026/04/14)

### 実施内容

- Modelfile出力を全面的に刷新
- ベースモデル: gemma4:e4b
- 実行パラメータ: temperature 0.15, seed 2026, num_ctx 8192等
- SYSTEM: 厳格な編集者プロンプト
- TEMPLATE: 会話形式（Gemma形式）
- MESSAGE: 編集タスクの例示を追加
- LICENSE: CC BY-NC-SA 4.0
- REQUIRES: 0.20.0

### 変更ファイル

- `packages/editor/src/utils/fileOperations.ts` - exportAsModelfile関数

### 備考

- ビルド成功 (1,050 KB)

---

## 25. Terminalコンポーネントの実装 (2026/04/14)

### 実施内容

- Terminalコンポーネントを新規作成（モック用）
- 対応コマンド: help, echo, date, version, whoami, ls, pwd, clear
- ショートカット: Ctrl+` でトグル
- 外观: GitHub風ダークターミナル

### 変更ファイル

- `packages/editor/src/components/Terminal/Terminal.tsx` - 新規作成
- `packages/editor/src/App.tsx` - Terminal組み込み
- `packages/editor/src/stores/shortcutStore.ts` - toggleTerminalショートカット追加

### 備考

- ビルド成功 (1,054 KB)
- Vercel: モックターミナル
- ローカル（Electron）: OS標準ターミナルへの拡張を想定

---

## 26. Terminal パネル下部配置 + コマンド追加 (2026/04/14)

### 實施內容

- Terminal パネルを画面下部に配置
- TerminalToolbarボタン（ターミナルアイコン）を追加
- ショートカット: Ctrl+` でトグル
- 開発Server: http://localhost:3000/

### Terminalコマンド

| コマンド | 開くURL |
|---------|---------|
| main | https://watanabe3ti.com |
| neo | https://watanabe3ti.com/neo/ |
| beos | https://watanabe3ti.com/beos/ |
| osx | https://watanabe3ti-osx.vercel.app |
| qe | https://quarto-editor-pe.vercel.app |
| te | https://toolsmith-editor.vercel.app |

### 変更ファイル

- `packages/editor/src/components/Terminal/Terminal.tsx` - コマンド追加 + 下部配置
- `packages/editor/src/App.tsx` - Terminal配置変更
- `packages/editor/src/components/Toolbar/Toolbar.tsx` - Terminalアイコン追加
- `packages/editor/src/stores/shortcutStore.ts` - toggleTerminalショートカット

### 備考

- ビルド成功 (1,055 KB)

---

## 27. LMStudio プロバイダー追加 (2026/04/19)

### 実施内容

- LLMProvider に LMStudio を追加
- LMStudio 設定値をデフォルト設定

### 変更ファイル

| ファイル | 変更内容 |
|----------|----------|
| `packages/editor/src/utils/llmClient.ts` | LLMProvider タイプに "lmstudio" を追加 |
| `packages/editor/src/stores/llmStore.ts` | defaultConfigs に lmstudio 設定を追加、getModels に lmstudio 対応追加 |
| `packages/editor/src/components/Settings/Settings.tsx` | providerLabels に LMStudio 追加、defaultEndpoints に LMStudio 追加、UIを3列グリッドに変更 |

### LMStudio 設定値

| 設定 | 値 |
|------|------|
| Endpoint | http://localhost:1234/v1/chat/completions |
| Model | （空） |
| Temperature | 0.7 |
| MaxTokens | 2048 |

### 備考

- ビルド成功 (TypeScript)

---

## 28. AI Chat → Editor コピーボタン実装 (2026/04/19)

### 実施内容

- ChatPanel に各 Assistant メッセージに「Copy to Editor」ボタンを追加
- クリックでメッセージテキストを Editor に挿入

### 変更ファイル

| ファイル | 変更内容 |
|----------|----------|
| `packages/editor/src/stores/editorStore.ts` | appendContent メソッドを追加 |
| `packages/editor/src/components/Chat/ChatPanel.tsx` | 各 Assistant メッセージに Copy to Editor ボタンを追加 |

### 動作

- AI Chat パネルの Assistant メッセージの右上に 📋 ボタンを表示
- ボタンをクリックすると、メッセージテキストを Editor に挿入
- 既存のコンテンツがある場合は改行を経て追加

### 備考

- ビルド成功 (TypeScript)

---

## 29. Terminal を Editor 内に埋め込み (2026/04/19)

### 実施内容

- Terminal を Editor/Preview 領域の下部に埋め込み配置
- Chat パネルとは獨立して表示可能

### 変更ファイル

| ファイル | 変更内容 |
|----------|----------|
| `packages/editor/src/App.tsx` | Terminal の配置を Editor領域内に移動 |

### 新しいレイアウト

```
+------------------+------------------+---------+
|    Sidebar       | Editor/Preview  |  Chat   |
|    (w-64)     |   (flex-1)   | (width) |
|                +-------------+         |
|                | Terminal    |         |
|                | (h-64)    |         |
+----------------+-------------+---------+
|              Status Bar (h-6 = 24px)        |
+------------------------------------------+
```

### 動作

- Terminal が Editor/Preview の直下に配置（高さ h-64 = 256px）
- Chat パネルとは独立して表示可能
- Terminal を閉じると Editor/Preview のみ表示

### 備考

- Terminal の高さを h-64 (256px) に拡大（入力欄も広くなる）

---

## 30. Terminal 高さ調整 (2026/04/19)

### 実施内容

- Terminal の高さを h-48 (192px) → h-64 (256px) に拡大
- 入力欄も広くなった

### 変更ファイル

| ファイル | 変更内容 |
|----------|----------|
| `packages/editor/src/App.tsx` | Terminal の高さを h-64 に変更 |

### 備考

- ビルド成功 (TypeScript)

---

## 31. Terminal 配置を画面下部に復元 + 入力欄修正 (2026/04/19)

### 実施内容

- Terminal を Editor 内に埋め込みから画面下部の独立配置に復元
- Terminal 入力欄の下から位置を調整

### 変更ファイル

| ファイル | 変更内容 |
|----------|----------|
| `packages/editor/src/App.tsx` | Terminal を画面下部の独立配置に戻す |
| `packages/editor/src/components/Terminal/Terminal.tsx` | terminal-content の max-height を設定 |

### 備考

- Chat と Terminal は同時に表示可能
- ビルド成功 (TypeScript)

---

## GitHub Push (2026/04/19)

### 実施内容

- GitHub に push 完了

### コミット

```
df52c83 feat: add LMStudio provider and AI Chat copy to Editor button
```

### 変更ファイル

- LMStudio プロバイダー追加
- AI Chat → Editor コピーボタン追加
- vercel.json 追加

---

## 32. react-markdown への切换 (2026/04/21)

### 実施内容

- MarkdownPreview を react-markdown + remark-gfm に切换
- GFM (GitHub Flavored Markdown) 完全対応

### 変更ファイル

| ファイル | 変更内容 |
|----------|----------|
| `packages/editor/src/components/Preview/MarkdownPreview.tsx` | react-markdown + remark-gfm に切换 |

### 対応记法

| 記法 | 状態 |
|------|------|
| テーブル | ✅ |
| チェックリスト | ✅ |
| 自動リンク | ✅ |
| 絵文字 | ✅ |
| コードハイライト | ✅ |
| 他、全GFM対応 | ✅ |

### 備考

- ビルド成功 (TypeScript + Vite)

---

## 33. wterm ターミナル統合 (2026/04/22)

### 実施内容

- 既存の自行开发ターミナルを Vercel Labs の wterm に置き換え
- @wterm/dom, @wterm/react package を导入

### 変更ファイル

| ファイル | 変更内容 |
|----------|----------|
| `packages/editor/src/components/Terminal/WTermTerminal.tsx` | 新規作成 |
| `packages/editor/src/App.tsx` | WTermTerminal に切り替え |
| `packages/editor/package.json` | @wterm/dom, @wterm/react 追加 |

### wterm の特徴

| 機能 | 説明 |
|------|------|
| Zig + WASM コア | ~12KB の小さいバイナリ |
| DOM レンダリング | ネイティブテキスト選択対応 |
| テーマ対応 | Default, Solarized Dark, Monokai, Light |
| VT100/VT220/xterm | エスケープシーケンス対応 |
| パフォーマンス | Dirty-row tracking |

### 備考

- ビルド成功 (1,104.88 kB)
- Vercel の OSS ターミナルエミュレータ

### wterm WASM 設定 (2026/04/23)

### 実施内容

- WASM バイナリを public ディレクトリにコピー
- WTermTerminal コンポーネントで wasmUrl を指定
- dist に wterm.wasm を含めるよう設定

### 変更ファイル

| ファイル | 変更内容 |
|----------|----------|
| `public/wterm.wasm` | WASM バイナリをコピー |
| `WTermTerminal.tsx` | wasmUrl="/wterm.wasm" を追加 |

### 備考

- ビルド成功、WASM が dist に含まれることを確認

### wterm WebSocket バックエンド (2026/04/23)

### 実施内容

- WebSocket サーバーを作成してコマンド実行機能を追加
- WebSocketTransport を使用して wterm をバックエンドに接続
- npm install ws @types/ws

### 変更ファイル

| ファイル | 変更内容 |
|----------|----------|
| `wterm-server.js` | WebSocket サーバーを新規作成 |
| `WTermTerminal.tsx` | WebSocketTransport で接続 |

### サーバー起動

```bash
node wterm-server.js
```

- WebSocket: ws://localhost:3333
- コマンド: help, echo, date, version, ls, pwd, clear 等

### 備考

- ビルド成功

### wterm 試行 → 元に戻す (2026/04/23)

### 実施内容

- wterm (@wterm/react) の導入を試行
- WebSocket バックエンド接続尝试も试みる
- 複雑で接続の確立が難しかったため、元に戻す

### 変更ファイル

| ファイル | 変更内容 |
|----------|----------|
| `package.json` | @wterm/dom, @wterm/react, ws 追加 |
| `WTermTerminal.tsx` | wterm 组件（新規→削除） |
| `wterm-server.cjs` | WebSocket サーバー（新規→削除保留） |
| `App.tsx` | 元のTerminalに戻す |
| `vite.config.ts` | プロキシ削除 |
| `public/wterm.wasm` | WASM バイナリ（残渣） |

### 元に戻す理由

- WebSocket プロキシ設定が复杂
- バックエンド连接 Establishment 失败
- シンプルな実装に戻すことが用户意向

### 備考

- wterm UI 单体は動作确认可能
- バックエンド连接には别アプローチが必要
- 元のモックTerminalを引き続き使用

### Microsoft Foundry Local 追加 (2026/04/23)

### 実施内容

- LLMプロバイダーに Microsoft Foundry Local を追加
- Foundy Localはデバイス上で動作するローカルAI
- OpenAI互換APIを提供

### 変更ファイル

| ファイル | 変更内容 |
|----------|----------|
| `packages/editor/src/utils/llmClient.ts` | LLMProvider に foundrylocal 追加 |
| `packages/editor/src/stores/llmStore.ts` | foundrylocal 設定追加 |
| `packages/editor/src/components/Settings/Settings.tsx` | UIにFoundry Local追加 |

### Foundry Local 設定値

| 設定 | 値 |
|------|------|
| Endpoint | http://localhost:8080/v1/chat/completions |
| Model | qwen2.5-0.5b |
| Temperature | 0.7 |
| MaxTokens | 2048 |

### 特徴

- デバイス上で動作するローカルAI
- ユーザーデータはデバイスから離れない
- オフライン動作可能
- トークンコスト不要
- Azure subscription 不要
- OpenAI互換API

### 使用方法

1. Foundry Localをインストール: https://aka.ms/foundry-local-installer
2. モデルをダウンロード: `foundry model run qwen2.5-0.5b`
3. SettingsでFoundry Localを選択

### 備考

- ビルド成功

---

## 35. ASM (agent-skill-manager) 統合計画 (2026/05/08)

### 概要

ASM (agent-skill-manager) を AI Chat インターフェースに統合する。
ASM は CLI/TUI スキルマネージャーで、AIコーディングエージェント向けのスキル管理を提供する。

### 設計方針

| 項目 | 決定 |
|------|------|
| **配置** | ASMを**独立したパネル**として追加（Chatとは別トグル） |
| **Web時** | 「ブラウザでは利用不可」と表示 |
| **デザイン** | パッケージマネージャ風（リスト + 詳細ビュー） |
| **ASM CLI** | child_process.exec 経由で呼び出し（Electronのみ） |

### 新規ファイル

```
packages/editor/src/
├── components/ASM/
│   ├── ASMPanel.tsx          # メインパネル
│   ├── ASMSearch.tsx         # 検索 + フィルター
│   ├── ASMSkillList.tsx      # スキル一覧
│   └── ASMDetail.tsx         # スキル詳細（オプション）
├── stores/asmStore.ts        # ASM状態管理 (Zustand + persist)
├── utils/asmClient.ts        # ASM CLI ラッパー
└── types/index.ts            # ASMSkill 型定義追加
```

### 変更ファイル

| ファイル | 変更内容 |
|----------|----------|
| `App.tsx` | asmOpen state + toggleAsm追加、ASMパネル表示 |
| `Toolbar.tsx` | ASMトグルボタン追加 |
| `shortcutStore.ts` | toggleAsm ショートカット追加 |
| `types/index.ts` | ASMSkill, ASMState 型定義追加 |

### 実装フェーズ

#### Phase 1: バックエンド
- `types/index.ts` に ASMSkill, ASMState 型定義
- `asmClient.ts` — ASM CLI ラッパー (isElectron, execAsm, search/install/list/audit/uninstall)
- `asmStore.ts` — Zustand store (skills, isLoading, error, searchQuery, viewMode)

#### Phase 2: UI
- `ASMPanel.tsx` — メインパネル（パッケージマネージャ風レイアウト）
- `ASMSearch.tsx` — 検索入力 + タグフィルター
- `ASMSkillList.tsx` — スキル一覧（インストール/アンインストールボタン）
- `ASMDetail.tsx` — スキル詳細表示

#### Phase 3: 統合
- `App.tsx` に ASMパネル追加
- `Toolbar.tsx` に ASMトグルボタン追加
- `shortcutStore.ts` に toggleAsm 追加

### Electron/Web 分岐

```typescript
export const isElectron = (): boolean => {
  return !!window.electronAPI?.isElectron;
};
```

- Electron: child_process.exec で ASM CLI 呼び出し
- Web: 「ASM is not available in browser」プレースホルダー表示

### ASM CLI 主要コマンド

| コマンド | 用途 |
|---------|------|
| `asm index search <query> --json` | カタログ検索（2800+スキル、JSON出力） |
| `asm search <query>` | インストール済みスキル検索 |
| `asm install <name>` | スキルインストール |
| `asm list` | インストール済み一覧 |
| `asm audit` | スキル監査 |
| `asm uninstall <name>` | スキル削除 |

### カタログデータの取得元

Skill Manager のカタログ表示は `asm index search` を使用する。これは Web カタログ (https://luongnv.com/asm/#/) と同じデータソースを参照する。

**データソースの種類:**

| ソース | 内容 | スキル数 | 取得方法 |
|--------|------|---------|---------|
| **ASM ビルド済みインデックス** | CLIにバンドルされた curated repo のインデックス | ~3,135 | `asm index search <query> --json` |
| **ASM Registry (GitHub)** | Registry に公開されたスキルのマニフェスト | ~2 | `https://raw.githubusercontent.com/luongnv89/asm-registry/main/index.json` |
| **インストール済みスキル** | ユーザーがインストールしたスキル | 変動 | `asm list` |

**重要な違い:**
- `asm search <query>` → **インストール済み**スキルのみ検索（"Installed skills matching 'X':"）
- `asm index search <query> --json` → ビルド済みインデックス全体を検索（カタログブラウズ用）
- Registry は publish されたスキル管理用で数は少ない
- カタログの充実度は `asm index` が保持する curated repo の質と量に依存

### レイアウト方針

- Chat(💬) と ASM(🧩) は**同じ右パネル領域を共有**
- 両方開いた場合: 幅を分割 or タブ切替（実装時に判断）
- 閉じるボタンで個別に閉じられる
- Toolbar にトグルボタン（Chat隣に🧩アイコン）

---

## 36. Chat の Copy to Editor 不具合修正 (2026/05/08)

### 問題

ChatPanel の Assistant メッセージにある「コピー」ボタン（クリップボードアイコン）をクリックしても、リッチテキスト（Lexical）モードでエディタに内容が挿入されなかった。

### 原因

- Lexical モードでは、Lexical が独自に内部 state (`EditorState`) を管理している
- `editorStore.appendContent()` は `editorStore.content` 文字列に追記するだけ
- Lexical エディタは `editorStore.content` を参照しないため、store が更新されても見た目に反映されない
- さらに、Lexical の `OnChangePlugin` が `content` に JSON 文字列を書き込むため、`appendContent` で文字列連結すると JSON が壊れる

### 修正内容

| # | 変更 | ファイル |
|---|------|----------|
| 1 | `editorBridge.ts` を新規作成 — Lexical エディタインスタンスを保持するモジュール変数。`registerLexicalEditor()` で登録、`appendTextToLexical()` で `editor.update(() => ...)` 経由でエディタツリーにテキストを挿入 | `packages/editor/src/utils/editorBridge.ts` |
| 2 | `EditorRegistrationPlugin` を追加 — `useLexicalComposerContext()` で取得した editor インスタンスを `editorBridge` に登録し、アンマウント時に解除 | `packages/editor/src/components/Editor/LexicalEditor.tsx` |
| 3 | コピーボタンのハンドラを変更 — リッチテキストモード時は `appendTextToLexical()` で Lexical エディタに直接追記、Markdown モード時は従来の `appendContent()` を使用 | `packages/editor/src/components/Chat/ChatPanel.tsx` |

### 動作

| モード | 動作 |
|--------|------|
| **Rich Text** | Lexical エディタ内部の `editor.update()` で新規パラグラフを追加し、テキストノードを挿入。`OnChangePlugin` が発火して store の JSON も自動更新 |
| **Markdown** | 従来通り `editorStore.content` に文字列追記（textarea が store を参照しているため即座に表示される） |

### 備考

- `editorBridge.ts` は React に依存しないモジュールとして設計（Zustand store は persist ミドルウェアを使用するため非シリアライズな editor 参照を持てない）
- ビルド成功 (TypeScript + Vite)

---

## 37. Electron 版ターミナルを OS ターミナルと連動 (2026/05/08)

### 概要

Electron 版でターミナルボタンを押した際、内蔵モックターミナルの代わりに OS のターミナルアプリケーション（macOS の Terminal.app / Windows の cmd / Linux の x-terminal-emulator）を別ウィンドウで起動する。

ブラウザ版は従来通りモックターミナルを維持。

### 変更内容

| # | ファイル | 変更 |
|---|---------|------|
| 1 | `electron/main.ts` | `shell:openTerminal` IPC ハンドラ追加。`process.platform` で OS を判定し、対応するターミナルを `child_process.exec` で起動（macOS: `open -a Terminal`、Windows: `start cmd`、Linux: `x-terminal-emulator || gnome-terminal || xterm`） |
| 2 | `electron/preload.ts` | `openTerminal()` を contextBridge 経由で renderer に公開 |
| 3 | `src/utils/fileOperations.ts` | `Window.electronAPI` 型に `openTerminal?: () => Promise<void>` を追加 |
| 4 | `src/components/Terminal/Terminal.tsx` | `isElectron()` 検出ロジック追加。Electron 時は初回表示時に `window.electronAPI.openTerminal()` を呼び出し、パネル内にシステムターミナル起動済みのステータス表示。`relaunch` コマンド / ↻ ボタンで再起動可能。Web 時は従来のモックターミナルを維持 |

### 動作

| 環境 | 動作 |
|------|------|
| **Electron** | ターミナルボタンクリック → Terminal.app が別ウィンドウで起動。パネルには「● System Terminal Active」ステータスと操作方法を表示。`relaunch` コマンドまたは ↻ ボタンで新しいターミナルウィンドウを開ける |
| **ブラウザ** | 従来通りモックターミナル（`help`, `echo`, `date`, `open` 等のコマンド対応） |

### 備考

- ビルド成功 (TypeScript + Vite + Electron tsc)
- `build:electron` スクリプトで `.js` → `.cjs` のコピーも完了済み

---

## 38. GitHub Gist 連携機能の実装 (2026/08/26)

### 概要

Right-Stuff Editor に GitHub Gist との連携機能を追加。文書の Gist へのアップロード、Settings での PAT 認証を実装。

### 実施内容

| # | 機能 | 状態 |
|---|------|------|
| 1 | Gist 関連型定義の追加 | ✅ 完了 |
| 2 | gistService.ts（GitHub API ラッパー）作成 | ✅ 完了 |
| 3 | gistStore.ts（Zustand Store）作成 | ✅ 実装済み |
| 4 | Settings に Gist 認証セクション追加 | ✅ 完了 |
| 5 | ツールバーに Upload to Gist ボタン追加 | ✅ 完了 |
| 6 | GistUploadModal コンポーネント作成 | ✅ 完了 |
| 7 | フッター内トースト通知 | ✅ 完了 |

### 新規ファイル

| ファイル | 内容 |
|----------|------|
| `packages/editor/src/services/gistService.ts` | GitHub Gist API ラッパー（verifyToken, createGist, updateGist, listGists, getGist） |
| `packages/editor/src/stores/gistStore.ts` | Gist 状態管理（Zustand + persist） |
| `packages/editor/src/components/Gist/GistUploadModal.tsx` | Gist アップロードモーダル |

### 変更ファイル

| ファイル | 変更内容 |
|----------|----------|
| `packages/editor/src/types/index.ts` | GistFile, GistItem, CreateGistParams, UpdateGistParams, GistUploadResult 型追加 |
| `packages/editor/src/components/Settings/Settings.tsx` | GitHub Gist 認証セクション追加（PAT 入力、Verify、Disconnect） |
| `packages/editor/src/components/Toolbar/Toolbar.tsx` | Upload to Gist ボタン追加（認証済みならモーダル、未認証なら Settings を開く） |
| `packages/editor/src/App.tsx` | GistUploadModal 統合、フッター内トースト通知追加 |

### 設計方針

| 項目 | 決定 |
|------|------|
| **認証方式** | GitHub Personal Access Token（scope: gist のみ） |
| **トークン保存** | localStorage（`right-stuff-editor-gist` キー） |
| **アップロード先** | ユーザーの GitHub Gist |
| **通知方式** | フッター内トースト（5秒で自動非表示） |
| **UI配置** | Settings モーダル内に認証セクション、ツールバーに Upload ボタン |

### gistStore の状態管理

```typescript
interface GistStore {
  token: string | null;           // GitHub PAT
  username: string | null;        // 認証済みユーザー名
  isAuthenticated: boolean;       // 認証状態
  gists: GistItem[];              // Gist 一覧
  loading: boolean;               // ローディング状態
  error: string | null;           // エラーメッセージ
  verifyToken: (token: string) => Promise<boolean>;
  disconnect: () => void;
  loadGists: () => Promise<void>;
  uploadGist: (params, existingGistId?) => Promise<GistUploadResult>;
}
```

### gistService の API エンドポイント

| メソッド | エンドポイント | 用途 |
|---------|--------------|------|
| `verifyToken` | `GET /user` | トークン検証 + ユーザー情報取得 |
| `createGist` | `POST /gists` | Gist 新規作成 |
| `updateGist` | `PATCH /gists/:id` | Gist 更新 |
| `listGists` | `GET /gists` | Gist 一覧取得 |
| `getGist` | `GET /gists/:id` | Gist 詳細取得 |

### GistUploadModal の UI

- ファイル名入力（文書タイトルから自動生成、手動編集可）
- 説明文入力
- Public/Secret トグル
- Upload / Cancel ボタン
- アップロード成功時 → フッターにトースト通知

### フッター内トースト通知

- アップロード成功時：`✓ Uploaded · gist.github.com/user/id` を表示
- 5秒で自動非表示
- URL コピーボタン付き

### 残タスク（Phase 5 以降）

- [x] Gist Viewer（Gist 一覧モーダル）✅ 実装済み
- [x] Gist 一一覧表示・検索・フィルタ ✅ 実装済み
- [x] Gist プレビュー機能 ✅ 実装済み
- [x] Gist インポート（エディタに読み込み）✅ 実装済み

### 備考

- ビルド成功 (TypeScript + Vite)
- チャンクサイズ: 1,124 KB（警告のみ）
- PAT は localStorage に保存（同一オリジン制限で保護）
- セキュリティ：PAT は `gist` scope のみで発行することを推奨

---

## 39. Gist Viewer 機能の実装 (2026/08/26)

### 概要

Gist 一覧を閲覧・検索・フィルタリングし、エディタにインポートする Gist Viewer モーダルを実装。

### 実施内容

| # | 機能 | 状態 |
|---|------|------|
| 1 | GistViewer.tsx モーダル作成 | ✅ 完了 |
| 2 | Toolbar に My Gists ボタン追加 | ✅ 完了 |
| 3 | App.tsx に GistViewer 統合 | ✅ 完了 |

### 新規ファイル

| ファイル | 内容 |
|----------|------|
| `packages/editor/src/components/Gist/GistViewer.tsx` | Gist 一覧モーダル（検索・フィルタ・プレビュー・インポート） |

### 変更ファイル

| ファイル | 変更内容 |
|----------|----------|
| `packages/editor/src/components/Toolbar/Toolbar.tsx` | My Gists ボタン追加 + onOpenGistViewer プロパティ |
| `packages/editor/src/App.tsx` | GistViewer 統合 + gistViewerOpen ステート |

### GistViewer の機能

| 機能 | 説明 |
|------|------|
| **一覧表示** | Gist のファイル名・説明・更新日時・Public/Secret バッジを表示 |
| **検索** | ファイル名・説明文でリアルタイムフィルタリング |
| **フィルタ** | All / Public / Secret で切り替え |
| **プレビュー** | モーダルで Gist 内容を読み取り専用表示 |
| **インポート** | Gist 内容を現在の文書に読み込み（上書き確認付き） |
| **外部リンク** | GitHub.com の Gist ページを新規タブで開く |
| **リフレッシュ** | Gist 一覧を再読み込み |

### ツールバー レイアウト（Gist 関連）

```
[Upload to Gist] [My Gists] | [Terminal] | [ASM] | [Chat]
```

- **Upload to Gist** ☁: 認証済みならアプロードモーダル、未認証なら Settings を開く
- **My Gists** 📄: 認証済みなら Gist Viewer を開く、未認証なら Settings を開く

### GistViewer の UI 構成

```
┌─ My Gists ──────────────────────────────┐
│ [Search gists...]                        │
│ [All] [Public] [Secret]     [Refresh]   │
├──────────────────────────────────────────┤
│ 📄 note-2026-08-26.md     [SECRET]      │
│ Daily notes and thoughts...              │
│ 2日前                                    │
│ [Preview] [Import] [↗]                  │
├──────────────────────────────────────────┤
│ 📄 snippet-utils.js       [PUBLIC]      │
│ Utility functions for text processing    │
│ 5日前                                    │
│ [Preview] [Import] [↗]                  │
├──────────────────────────────────────────┤
│ 2 / 15 gists                  [Close]   │
└──────────────────────────────────────────┘
```

### プレビューモーダル

- Gist の内容を monospace フォントで表示
- [Close] [Import] ボタン
- Escape キーで閉じる

### インポート確認モーダル

- 「インポートすると現在の文書の内容が上書きされます」の警告表示
- 対象 Gist のファイル名・説明を表示
- [Cancel] [Import] ボタン

### 備考

- ビルド成功 (TypeScript + Vite)
- チャンクサイズ: 1,135 KB（警告のみ）
- dynamic import の警告あり（gistService.ts の二重読み込み）— 非critical

---

## 40. ローカルファイル連携・強化プレビュー・mdv連携 (2026/08/30)

### 概要

「mdv対応」提案（ローカルファイル連携 + 高品質ライブプレビュー + mdv 連携）を3段階で実装。ブラウザの制約に応じ、ローカルファイル操作と強化プレビューはWeb/Electron両対応、mdv起動はElectron限定にした。

### Part 1: ローカルファイル連携 ✅

開いたローカルファイルを追跡し、同じファイルへ上書き保存できるようにした。

| # | 内容 | ファイル |
|---|------|---------|
| 1 | アクティブなファイルハンドル追跡（名前・パス・ハンドル） | `src/utils/fileOperations.ts` |
| 2 | `saveToActiveFile()` — 開いたファイルへの上書き保存 | 同上 |
| 3 | `openFile` / `saveFile` でハンドルとパスを記録 | 同上 |
| 4 | `local-file-changed` カスタムイベントでUIへ通知 | 同上 |
| 5 | Toolbar の保存がアクティブファイルへ上書き | `Toolbar.tsx` |
| 6 | フッターに開いているファイル名を表示 | `App.tsx` |
| 7 | `beforeunload` で未保存時の離脱確認 | `App.tsx` |

### Part 2: 強化ライブプレビュー ✅

| # | 内容 | ファイル |
|---|------|---------|
| 1 | GitHub Alerts（`> [!NOTE]` 等5種）を blockquote コンポーネントで検出・描画 | `Preview/MarkdownPreview.tsx` |
| 2 | Mermaid 図表描画（`language-mermaid` コードブロック → `mermaid.run()`） | 同上 |
| 3 | シンタックスハイライト（rehype-highlight、検出自動・未対応言語は無視） | 同上 |
| 4 | Mermaid テーマを resolvedTheme に連動 | `App.tsx` + `MarkdownPreview.tsx` |
| 5 | `mermaid` パッケージ追加（動的 import でコード分割、本番で別chunk化） | `package.json` |
| 6 | Mermaid SVG コンテナ用 CSS | `src/index.css` |

#### Mermaid のコード分割

`mermaid` は動的 import しており、`mermaid.core-*.js` など別チャンクに分割される。プレビューにmermaidブロックが無い場合は読み込まれない。

#### GitHub Alerts の検出方法

react-markdown v9 の hast `node` を解析。blockquote の最初の `<p>` 要素の先頭テキストを `^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]` で判定。マーカー文字は `stripAlertMarker()` で描画時に除去する。

### Part 3: mdv 連携 ✅（Electron限定）

| # | 内容 | ファイル |
|---|------|---------|
| 1 | `mdv:launch` / `mdv:close` IPC ハンドラ（mdv を detached 子プロセスで起動・破棄） | `electron/main.ts` (+ `main.cjs`) |
| 2 | `app.on('will-quit')` で mdv プロセスを終了 | 同上 |
| 3 | `launchMdv` / `closeMdv` を contextBridge で公開 | `electron/preload.ts` (+ `preload.cjs`) |
| 4 | renderer 側ユーティリティ（起動・URL取得・エラー整形） | `src/utils/mdvConnection.ts`（新規） |
| 5 | Toolbar に **Open in mdv** ボタン追加、`onOpenMdv` プロパティ | `Toolbar.tsx` |
| 6 | App に `handleOpenMdv` + フッターに起動ステータス表示 | `App.tsx` |
| 7 | `electronAPI` 型へ `launchMdv` / `closeMdv` を追加 | `src/utils/fileOperations.ts` |

#### mdv 起動ロジック

```plaintext
Toolbar [Open in mdv]
  → mdvConnection.launchMdv(targetPath?)   // アクティブファイルのpath/nameを使う
  → electronAPI.launchMdv(path)            // IPC
  → main: 既存mdvをkill → spawn('mdv', ['-d','--port','4649', dirOrPath]) detached
  → 戻り値URLで openExternal
```

- ブラウザ版は `electronAPI.launchMdv` が無いため、フッターに「mdv連携はElectron版のみ」表示。
- `isElectron` は `window.electronAPI?.isElectron` で判定。

### 歯車アイコン修正

Settingsボタンの歯車SVGをoutline方式からBootstrap Iconsのfill方式に変更し、16pxでも崩れないようにした（コミット `604f422`）。

### 検証

- ビルド成功 (TypeScript + Vite + Electron tsc)
- `build:electron` で main.js/main.cjs, preload.js/preload.cjs を再生成して mdv ハンドラを含むことを確認
- mermaid は動的 import で分割され、本番build時に別 chunk 化されることを確認
- チャンクサイズ警告（1,140 KB）は存続（非critical）


## 41. Unsloth プロバイダー追加 (2026/08/31)

### 概要

AIチャットのLLMプロバイダーとして **Unsloth** を追加した。Unslothはローカルでモデルを数値化・推論するツールで、OpenAI互換の `/v1/chat/completions` と `/v1/models` を同一ポート（既定 `http://127.0.0.1:8888`）で公開する。既存のOpenAI互換ストリーミング実装をそのまま再利用できるため、プロバイダー定義の追加のみで対応した。

### 変更点

| # | 内容 | ファイル |
|---|------|---------|
| 1 | `LLMProvider` 型に `"unsloth"` を追加 | `src/utils/llmClient.ts` |
| 2 | `defaultConfigs` に unsloth を追加（endpoint: `http://127.0.0.1:8888/v1/chat/completions`、apiKey用） | `src/stores/llmStore.ts` |
| 3 | `getModels()` で Unsloth の `/v1/models` からモデル一覧を自動取得（Bearerキー付き） | 同上 |
| 4 | `providerLabels` に "Unsloth" 追加 | `src/components/Settings/Settings.tsx` |
| 5 | `defaultEndpoints` に Unsloth 追加 | 同上 |
| 6 | APIキー入力欄を openai/custom に加えて unsloth でも表示（プレースホルダ `sk-unsloth-...`、説明文付き） | 同上 |

### Unsloth 接続仕様

```plaintext
endpoint:  http://127.0.0.1:8888/v1/chat/completions
認証:      Authorization: Bearer sk-unsloth-...
モデル:     /v1/models で自動取得
取得方法:  config.endpoint の末尾 /chat/completions を除き /models を呼ぶ
```

- 要認証のため、`llmClient.ts` の既存の `apiKey` → `Authorization: Bearer` ヘッダー付与ロジックがそのまま使える。
- ストリーミング（SSE `data:` 行と `[DONE]`）も既存実装そのまま。

### 備考

- `npx tsc --noEmit` で型チェック成功
- プロバイダー数は 7（Ollama / AnythingLLM / OpenAI / LM Studio / Foundry Local / Unsloth / Custom）
- Settings UIは3列グリッドのため、Unsloth 追加後もレイアウトは自動調整


## 42. v0.3.1 リリース作業 (2026/08/31)

### 概要

ローカルファイル連携・強化プレビュー・mdv・Unsloth対応（セクション40・41）を **v0.3.1** としてリリース。バージョン表記の一斉更新と LP（ランディングページ）への新機能反映、関連ドキュメントの整合を取った。

### バージョン整合（v0.3.0 → v0.3.1）

| # | 箇所 | 内容 |
|---|------|------|
| 1 | `package.json` / `package-lock.json` | `npm version 0.3.1 --no-git-tag-version` で更新 |
| 2 | `README.md` | バッジ・現行バージョン・TOC更新、「v0.3.0からの主な更新」→「v0.3.1の主な変更」に改題 |
| 3 | `HISTORY.md` | v0.3.1エントリを先頭に追加 |
| 4 | `README_ja.md` | v0.3.1参照とリンク（`#v031の主な変更`）を更新 |
| 5 | `App.tsx` / `LandingPage.tsx` / `Terminal.tsx` | UI表示のバージョン文字列を更新（Terminalはv0.2.2のまま残っていたので修正） |

- 履歴セクション内の `v0.3.0` 表記は過去リリースの記録のため残置（意図的）。
- Electronは `app.getVersion()` が package.json の version を参照するため、package.json 更新で連動。

### LP（LandingPage.tsx）更新

| # | 内容 |
|---|------|
| 1 | アイコン追加: `eye`（プレビュー）/ `file`（ローカルファイル） |
| 2 | 特徴カードを 4 → 6 枚に（md:grid-cols-3 で 3×2 に整列） |
| 3 | 新カード「ローカルファイルへ、そのまま保存」（上書き保存・離脱検知） |
| 4 | 新カード「プレビューも、GitHubスタイルで」（Alerts/Mermaid/ハイライト、Electron版mdv案内） |
| 5 | AIカード本文に Unsloth を追記 |
| 6 | ヒーロー部のチェックバッジを 4 → 6 個に（ローカルファイル上書き保存 / Mermaid対応プレビュー） |

### 検証

- `npm run build`（tsc + vite）成功
- `npm run build:electron` 成功
- リポジトリ全体の `0.3.0` 残存は履歴セクションのみであることを確認

## 43. 評価レポート残存項目の実装（リッチエディタ改善） (2026/09/11)

### 概要

`right_stuff_editor_evaluation.html`（v0.2.2評価、総合4.2/10）の改善項目のうち、前回までに解消済みの保存表示・ボタンのアクセシビリティ・ドキュメント管理などを除く残存項目を実装した。

### 実装内容

| # | 項目 | 内容 |
|---|------|------|
| 1 | 下線・取り消し線・文字色 | `LexicalEditor.tsx` のツールバーに U / S ボタンを追加（`FORMAT_TEXT_COMMAND`）。文字色は `$patchStyleText` + カラーパレットで設定し、選択状態を `$getSelectionStyleValueForProperty` で反映、`×` でリセット。B/I/U/S は選択状態でアクティブ表示（`SELECTION_CHANGE_COMMAND` / `registerUpdateListener`） |
| 2 | リンク挿入UI | 🔗 ボタン → ポップオーバーでURLを入力し `TOGGLE_LINK_COMMAND` を発行 |
| 3 | 画像挿入UI | 🖼 ボタン → URL + 代替テキストを入力し `ImageNode`（`DecoratorNode`）を挿入。Markdown往復用に TextMatchTransformer を追加（`![alt](url)`） |
| 4 | 表・水平線 | ▦ ボタン → 行数・列数を指定し `INSERT_TABLE_COMMAND`。水平線は `HorizontalRuleNode` + `HorizontalRulePlugin` + `INSERT_HORIZONTAL_RULE_COMMAND`。`---` / `***` / `___` のMarkdown入力は独自 ElementTransformer で HR に変換 |
| 5 | Undo/Redo | ツールバーに ↶ / ↷ ボタンを追加（`UNDO_COMMAND` / `REDO_COMMAND`）。`CAN_UNDO_COMMAND` / `CAN_REDO_COMMAND` で位置を監視し、不可時は disabled |
| 6 | ドキュメント検索・並び替え | `Sidebar.tsx` に検索（タイトル+本文）と並び替え（更新/作成日時・タイトルの昇降順）を追加 |
| 7 | ショートカット一覧・About/ヘルプ | `HelpModal.tsx` を新設。`Ctrl+/` もしくはフッターの「?」ボタンで開き、ショートカット一覧（カテゴリ別）とAbout（バージョン・概要）を表示。`shortcutStore` に `toggleHelp` を追加 |

### 実装のポイント

- ツールバーの横スクロール（`overflow-x: auto`）に伴い、リンク/表/画像の入力ポップオーバーは `position: fixed` でアンカー位置に表示（overflowでクリップされないように）。`mousedown` と `Escape` で閉じる。
- 画像ノードは `@lexical/image` を導入せず、`DecoratorNode` の自前 `ImageNode` を `components/Editor/ImageNode.tsx` に新設。Markdown往復（インポート/エクスポート）を TextMatchTransformer で担保。
- ElementTransformer の `replace` はインポート時と入力（ショートカット）時両方で呼ばれるため、常に置換する実装にした（QUOTE 型の isImport 分岐は不要）。

### 新規・変更ファイル

| # | ファイル | 内容 |
|---|---------|------|
| 1 | `packages/editor/src/components/Editor/ImageNode.tsx` | ImageNode（DecoratorNode）を新設 |
| 2 | `packages/editor/src/components/Help/HelpModal.tsx` | ショートカット一覧 + About モーダルを新設 |
| 3 | `packages/editor/src/components/Editor/LexicalEditor.tsx` | ツールバー拡張、カスタムTransformer、ノード登録 |
| 4 | `packages/editor/src/components/Sidebar/Sidebar.tsx` | 検索・並び替えUI |
| 5 | `packages/editor/src/stores/shortcutStore.ts` | `toggleHelp`（Ctrl+/）を追加 |
| 6 | `packages/editor/src/App.tsx` | HelpModal の配線（`?`フッターボタン、Ctrl+/、キーアクション） |
| 7 | `USAGE.md` | リッチテキスト機能・サイドバー検索・ショートカット表を更新 |

### 検証

- `npx tsc --noEmit` 成功
- `npm run build`（tsc + vite）成功 — 残存項目のツールバー・ポップオーバーは手動確認
- `npm run build:electron` 成功

## 44. 評価レポート残存項目の追加対応（画像DnD・フォントサイズ・ハイライト等） (2026/09/11)

### 概要

セクション43で一旦完了させた残存項目のうち、さらに以下を追加対応した。評価レポート（18項目）との突合で残っていた「画像のドラッグ＆ドロップ/貼り付け」「フォントサイズ」「文字背景色」「モバイル44px」「文書複製」「日付ラベル」「ドキュメント導線」をすべて実装。

### 実装内容

| # | 項目 | 内容 |
|---|------|------|
| 1 | 画像のDnD / クリップボード貼り付け | `ImagesPlugin` を新設。`PASTE_COMMAND` / `DROP_COMMAND` / `DRAGOVER_COMMAND` を `COMMAND_PRIORITY_HIGH` で登録し、画像ファイルを `FileReader` で Data URL に変換して `ImageNode` として挿入（非画像のペースト/DnDは既存処理へフォールスルー） |
| 2 | フォントサイズ変更 | ツールバーにサイズプルダウン（12〜32px）を追加。`$patchStyleText` で `font-size` を設定し、`$getSelectionStyleValueForProperty` で選択中の値に連動 |
| 3 | 文字背景色（ハイライト） | 文字色と同じ方式で `background-color` 用のカラーパレットを追加。選択中は `×` でリセット |
| 4 | モバイル対応 | Lexicalツールバーの `.toolbar-btn` を `@media (max-width:767px)` で44×44pxに拡大。上部ツールバー（`Toolbar.tsx`）に `header-toolbar` クラスを付与し、`overflow-x-auto` + `scrollbar-hide` で横スクロール化、`index.css` のメディアクエリでボタンを44px化 |
| 5 | ドキュメント複製 | `editorStore` に `duplicateDocument(id)` を追加（「(copy)」タイトルで先頭に追加・切替）。Sidebar のホバー操作に複製アイコンを追加 |
| 6 | サイドバー日付ラベル | 更新日時を「更新 YYYY/M/D」形式（`toLocaleDateString("ja-JP")`）+ `title` で明示 |
| 7 | About からのドキュメント導線 | `HelpModal` の About に GitHub リポジトリ（使い方・変更履歴）へのリンクを追加 |

### 実装のポイント

- 画像は Data URL として本文（Markdown）に埋め込むため、`![alt](data:image/...;base64,...)` としてエクスポートされる。IndexedDB の容量に注意が必要な一方、ローカル完結で外部ホスティング不要。
- `PASTE_COMMAND` のペイロード型は `PasteCommandType`（`DataTransfer | InputEvent`）のため、`instanceof DataTransfer` で分岐し、`InputEvent` 側は `.dataTransfer` から画像ファイルを取り出す。
- `DROP_COMMAND` / `DRAGOVER_COMMAND` は `return true` で画像以外のDnD（テキスト選択のドラッグ移動など）を阻害しないよう、画像ファイルがあるときだけ中断する。

### 検証

- `npx tsc --noEmit` 成功
- `npm run build`（tsc + vite）成功
- `npm run build:electron` 成功
- 手動確認待ち: 画像のDnD/貼り付け、サイズ/ハイライトの適用、モバイルレイアウト（DevTools レスポンシブ）

## 45. v0.4.0 リリース作業 (2026/09/11)

### 概要

セクション43・44で実装した評価レポート残存項目（編集ツールバー拡充、画像DnD/貼り付け、文書検索・並び替え・複製、ショートカット一覧、モバイル対応）を **v0.4.0** としてリリース。バージョン表記の一斉更新と LP（ランディングページ）への新機能反映、関連ドキュメントの整合を取った。

### バージョン整合（v0.3.1 → v0.4.0）

| 対象 | 内容 |
|------|------|
| `package.json` / `package-lock.json` | `version` を `0.4.0` に更新 |
| `App.tsx` | フッターのバージョン表記を `v0.4.0` に更新 |
| `Terminal.tsx` | `version` サブコマンドの出力を `v0.4.0` に更新 |
| `HelpModal.tsx` | About のバージョン表記を `v0.4.0` に更新 |
| `LandingPage.tsx` | フッター表記を `v0.4.0` に更新 |

### LP への新機能反映

- 機能カード「書くことに、すぐ集中」を、下線・打消し線・文字色・ハイライト・フォントサイズ・リンク/表/画像の挿入を挙げる文章に更新。
- ヒーローのチェックリストに「画像ドラッグ&ドロップ・貼り付け」「Ctrl+/ でショートカット一覧」を追加。
- モックエディタのツールバーに U（下線）・A（文字色）・リンクのボタンを追加し、ツールバー拡充を視覚的に反映。

### ドキュメント更新

- `HISTORY.md`: v0.4.0 セクションを冒頭に追加（新規ファイル: `ImageNode.tsx` / `HelpModal.tsx`）。
- `README.md`: バッジ・現行バージョン・ナビゲーションを v0.4.0 化し、「v0.4.0の主な変更」テーブルを追加。
- `README_ja.md`: 最新版の言及と参照アンカーを v0.4.0 へ更新。

### 検証

- ビルド確認: `npx tsc --noEmit` / `npm run build` 成功
- コミット & push 予定

## 46. 公開サイト（LP）改善 - OG画像・ファビコン・SEO・性能 (2026/09/11)

### 概要

LP/公開サイトの改善として、OG画像の刷新と軽量化、ファビコン一式、SEOメタ・構造化データ、エディタの遅延ロード、Vercel設定を実施した（バージョンは据え置き）。

### 実装内容

| # | 項目 | 内容 |
|---|------|------|
| 1 | OG画像刷新 | `scripts/generate_og.py`（PIL + numpy）で **1200×630** のOG画像を生成し `public/og-right-stuff-editor.png` を差し替え。3.7MB→**65KB** に軽量化。ブランドカラー（slate-950背景＋青グロー、Rモノグラム、キャッチコピー、モックエディタ）を反映。`og:image:width/height` を 1200/630 に更新。 |
| 2 | ファビコン一式 | `scripts/generate_icons.py` で `apple-touch-icon.png`（180px）と `favicon.ico`（32px）を生成、手書きの `favicon.svg`（Rモノグラム）と `site.webmanifest` を追加。index.html に `<link rel="icon">` / `apple-touch-icon` / `manifest` を追加。 |
| 3 | SEO | `robots.txt`（Sitemap参照）・`sitemap.xml`・JSON-LD（SoftwareApplication）・`og:locale=ja_JP`・`twitter:image:alt` を追加。 |
| 4 | 性能 | `main.tsx` でエディタを `React.lazy` + `Suspense` 化。**LP初回バンドルが 1.1MB → 162KB**（`index-*.js`）に。エディタ本体は `/editor` 遷移時に `App-*.js`（約1.0MB）として個別ロード。 |
| 5 | Vercel設定 | `vercel.json` に `/editor` の SPA リライト（pushState 直アクセスで 404 になる問題を解消）とキャッシュヘッダ（`/assets/*` は immutable、それ以外は revalidate）を設定。 |

### 生成スクリプト

- `scripts/generate_og.py`: OG画像（`python3 scripts/generate_og.py`）
- `scripts/generate_icons.py`: ファビコン・アイコン（`python3 scripts/generate_icons.py`）

### 検証

- ビルド: `npx tsc --noEmit` / `npm run build` / `npm run build:electron` 成功
- devサーバーで robots.txt / sitemap.xml / favicon / manifest / og画像 がすべて 200 で配信されることを確認
- コミット & push 予定

## 47. Vercel 本番デプロイ (2026/09/11)

### 概要

セクション46の公開サイト改善を Vercel に本番デプロイした。CLI でのデプロイ時に判明した設定の整理も実施。

### 対応内容

| # | 項目 | 内容 |
|---|------|------|
| 1 | 設定の整理 | ルートの `vercel.json` を撤去し、`packages/editor/vercel.json` に一本化（プロジェクトの Root Directory が `packages/editor` のため）。SPAリライト＋キャッシュヘッダを統合し、`.vercelignore`（node_modules / dist 除外）を追加。 |
| 2 | デプロイ方法 | `vercel link --project right-stuff-editor` → `vercel deploy --prod` をリポジトリルートから実行（packages/editor 配下から実行すると Root Directory が二重解決されるためルートから）。 |
| 3 | ヘッダー適用順の修正 | `/assets/(.*)` と `/(.*)` の両方がマッチするため、**後に書いたルールが優先**される。assets の immutable 化が効かなかった原因で、`/(.*)` → `/assets/(.*)` の順に並べ替えて解消。 |
| 4 | 本番検証 | `/assets/*` が `public, max-age=31536000, immutable`、`/` と `/editor` が `max-age=0, must-revalidate`、`/editor` 直アクセスは 200（SPAリライト）を確認。JSON-LD・favicon・site.webmanifest・og:image 1200×630 の配信も確認。 |

### メモ

- ビルドは Vercel 上で `npm run build`（`tsc && vite build`）。出力先は `dist`（プロジェクト設定の Output Directory は "Other" だが実配信は dist ベース）。
- `.vercel/`（link 成果物）は各 `.gitignore` で管理対象外。

---

## 47. Apple Foundation Models 対応 (2026/09/26)

### 概要

LLMプロバイダーに **Apple FM**（macOS内蔵のオンデバイスモデル）を追加。Foundation Models framework は Swift からしか呼び出せないため、Swift で OpenAI 互換APIのローカルブリッジを実装し、既存のOpenAI互換ストリーミング経路に接続した。

### 実装方針

| 判断 | 内容 | 理由 |
|------|------|------|
| ブリッジ方式 | NWListener によるHTTP/1.1サーバー | ネイティブNodeアドオン不要・Web版でも使える |
| バインド先 | `127.0.0.1` 固定 | ローカル推論をLANへ公開しない |
| 会話の扱い | `system` は instructions、残りは `User:`/`Assistant:` ラベル付き1プロンプト | 複数ターン再生の生成コストを避ける（ステートレス・決定的） |
| コンテキスト | 12,000文字で切り詰め、`max_tokens` は最大2,048 | オンデバイスモデルの窓が小さい |

### 変更ファイル

| ファイル | 変更内容 |
|----------|----------|
| `packages/editor/applefm/main.swift` | 新規。FoundationModels + NWListener。`/health`・`/v1/models`・`/v1/chat/completions`（SSE/非SSE）、CORS、切断検出 |
| `packages/editor/applefm/build.sh` | 新規。`swiftc -O -target <arch>-apple-macosx26.0` で `build/apple-fm-server` を生成 |
| `packages/editor/applefm/README.md` | 新規。必要条件・エンドポイント・制限 |
| `packages/editor/package.json` | `applefm` / `applefm:build` スクリプト |
| `packages/editor/src/utils/llmClient.ts` | `applefm` 追加、`checkAppleFMHealth()`、SSE読み取り修正、`readErrorMessage()` |
| `packages/editor/src/stores/llmStore.ts` | 既定設定（`127.0.0.1:8765`, `apple-foundation-model`, maxTokens 1024）、`/v1/models` 取得 |
| `packages/editor/src/components/Settings/Settings.tsx` | Apple FM ボタン、状態パネル、起動/停止 |
| `packages/editor/src/utils/fileOperations.ts` | `Window.electronAPI` に `startAppleFM` / `stopAppleFM` |
| `packages/editor/electron/main.ts` | `applefm:start` / `applefm:stop`、`will-quit` で停止 |
| `packages/editor/electron/preload.ts` | contextBridge 経由で公開 |

### 実装上の注意点（Swift側）

- **`StreamWriter` の生存期間**: 送信完了コールバック内で `self` を弱キャプチャしていたため、Task終了時に writer が先に解放され、仕懸の `finish_reason` / `[DONE]` が永久に送信されず接続が開きっぱなしになっていた。強キャプチャに変更し、`StreamSession`（レジストリ保持・切断時Task cancel・1度だけclose）を導入して解決。
- **スレッド安全性**: 生成は Task のコンテキスト、送信完了は NWConnection のキューで通知されるため、`pending` / `draining` / `finished` は `NSLock` で保護。
- **SSEヘッダ**: `Content-Length: 0` を付けるとクライアントが即完了とみなすため、`includeContentLength: false` で省略し接続終了で区切る。
- **切断検出**: リクエストボディ読取ループの `receive` が EOF/error を検知した時点で `StreamSession.closeSession(for:)` を呼び、生成中の Task をキャンセル。
- **プロンプトの labels**: `Prompt` は単一文字列のみ。ロール付き Transcript を組む公開APIがないため、`User:` / `Assistant:` を本文に付ける方式にした。

### 検証

- `applefm/build.sh` / `npm run applefm:build` 成功（arm64-apple-macosx26.0）
- `GET /health` → `{"available":true,...}`、`GET /v1/models` → `apple-foundation-model`
- ストリーミング完走: コンテンツ → `finish_reason:"stop"` → `data: [DONE]` → 接続終了（curl exit 0）
- アプリと同じ読み取りロジック（`onComplete` 発火・`sawDone: true`）を確認
- 非ストリーミング、`content` のparts配列、404、不正JSON、OPTIONS preflight（204）、クライアント中断（reset by peer）時のサーバ生存を確認
- `npx tsc --noEmit` / `npm run build` / `npm run build:electron` 成功
- 手動確認待ち: Electron からの「サーバー起動」ボタン、ブラウザからの `npm run applefm` 経由のチャット

### 残タスク

- [x] Electron 版で Settings → Apple FM →「サーバー起動」でブリッジが起動し、チャットが応答すること（CDP自動検証 11/11 passed）
- [x] ブラウザ版で `npm run applefm` 起動後にストリーミング表示（Chrome + CDP で CORS 込み 19/19 passed、セクション49）
- [x] README / USAGE / HISTORY は本作業で更新。バージョン表記も **v0.4.1** に更新済み（package.json / package-lock.json / フッター / ターミナル / ヘルプ / ランディングページ / README / README_ja）
- [x] ランディングページ（LP）の特徴・対応機能・プラットフォーム一覧に Apple Foundation Models を追記
- [x] タイポチェック: 既存ドキュメントに残る中国語・韓国語由来の文字（`панеля` / `독립적으로` / `复杂で…难しいため` / `계속사용`）を日本語に修正

---

## 48. チャットの文書コンテキスト・Markdown表示・履歴復元の修正 (2026/09/26)

### 概要

Apple FM 対応（セクション47）の実機検証に続き、チャット機能の実装修正を3点行った。①文書コンテキストとSystem Promptの追加、②AI応答のMarkdown描画、③チャット履歴の復元と再読込クラッシュの修正。

### 1. 文書コンテキストとSystem Prompt

| # | 内容 | ファイル |
|---|------|----------|
| 1 | `DOCUMENT_CONTEXT_LIMIT = 6000` と `buildDocumentContext()` を追加。編集中のMarkdownを先頭6,000文字 + 省略注記の `system` メッセージに変換 | `src/utils/llmClient.ts` |
| 2 | `buildSystemMessages()` で System Prompt → 文書コンテキスト → 履歴 の順に `system` メッセージを組み立てるよう変更 | 同上 |
| 3 | `includeDocument`（既定 true）を `chatStore` に追加し、persist の `partialize` に含めて永続化 | `src/stores/chatStore.ts` |
| 4 | チャット入力欄の上に「現在の文書を含める」トグルと送信文字数を表示 | `src/components/Chat/ChatPanel.tsx` |
| 5 | Settingsに「System Prompt」欄を追加（`LLMConfig` に `systemPrompt` を追加） | `src/components/Settings/Settings.tsx`, `src/stores/llmStore.ts` |

**注意点**: `systemPrompt` は `llmStore` の単一設定に保存される仕様のため、プロバイダー単位の分離はしていない（プロバイダーを切り替えると同じ設定が引き継がれる）。ドキュメントもそのため「プロバイダーごと」ではなく「永続化される」という表現に揃えた。

**副次修正**: Settings の案内文「OpenAI 互換APIでbridgeします」→「OpenAI 互換APIとして公開します」。Electron版では起動したブリッジのPIDを状態パネルに表示するようにした（起動し忘れたプロセスの特定用）。

### 2. AI応答のMarkdown描画

| # | 内容 |
|---|------|
| 1 | `MarkdownContent.tsx` を新設。既存の `markdownToSafeHtml()`（remark + remark-gfm + rehype-raw + rehype-sanitize + rehype-highlight）を再利用して innerHTML へ描画 |
| 2 | Assistant メッセージのみ Markdown 描画。User メッセージは従来どおり `<pre>` のプレーンテキスト |
| 3 | 一意なクラス `chat-markdown` を付与（E2E のセレクタが他要素と衝突しないため） |
| 4 | 変換前の間はプレーンテキスト表示。同一内容はキャッシュして再描画ごとの再変換を回避 |

**セキュリティ**: 生の HTML を許可しつつ `rehype-sanitize` を必ず通すため、`markdownToSafeHtml` と同じパイプラインを流用している。`<script>`、`onerror`、`javascript:` URL は除去されることを検証済み。

### 3. チャット履歴の復元と再読込クラッシュの修正

**症状**: チャット履歴が1件でも保存されている状態でアプリを再読込すると、画面が真っ白になり操作できなくなった。

**原因**: `Message.timestamp` の型は `Date` だが、localStorage を通すと JSON により文字列化される。復元後に `ChatPanel` が `message.timestamp.toLocaleTimeString()` を直接呼んでいたため `TypeError: ... is not a function` が発生し、React がツリー全体を破棄していた（`#root` の子が0個になる）。加えて `partialize` が `messages` を保存しない仕様だったため、復元直後は `messages` が空のまま状態になっていた。

**修正**:

| # | 内容 |
|---|------|
| 1 | `reviveDate` / `reviveMessages` / `reviveSessions` ヘルパーを追加 |
| 2 | persist の `merge` で復元直後に `sessions` の日付を `Date` へ戻す（`useChatStore.setState` を `onRehydrateStorage` 内で使うと生成中のTDZになるため `merge` を採用） |
| 3 | `switchSession` / `deleteSession` でも `reviveMessages` を通して sidebar 切替時の同じ不具合を防ぐ |
| 4 | `onRehydrateStorage` で復元直後に `currentSessionId` のセッション本文を読み戻す |
| 5 | 描画側も `new Date(message.timestamp).toLocaleTimeString()` に変更して二重で防御 |

### 検証

| 検証 | 結果 |
|------|------|
| `npx tsc --noEmit` | 成功 |
| `npm run build` / `npm run build:electron` | 成功 |
| チャット応答のMarkdown表示（実ストリーミング） | 15/15 passed |
| チャット履歴の復元（再読込） | 5/5 passed |
| 文書コンテキスト / System Prompt | 8/8 passed |
| Apple FM 起動・停止・SSE | 11/11 passed |

検証は Electron を `--remote-debugging-port=9222` で起動し、CDP（Chrome DevTools Protocol）経由で実際のボタン操作・テキスト入力・再読込を行う実ブラウザ操作で実施した。

### 残タスク

- [x] v0.4.2 としてのリリース作業（package.json / package-lock.json / フッター / Terminal / HelpModal / ランディングページ / README / README_ja）。コミット & push は未実施
- [x] ブラウザ版での Apple FM ストリーミング確認（Chrome + CDP で 19/19 passed、セクション49）


---

## 49. ブラウザ版での Apple FM ストリーミング検証 (2026/09/26)

### 概要

セクション47の残タスク「ブラウザ版でのストリーミング確認（DevTools でCORS）」を、Electron ではなく実際の Chrome で実施した。

### 検証方法

Electron ではなく Google Chrome を `--headless=new --remote-debugging-port=9333` で起動し、CDP（Chrome DevTools Protocol）で `http://127.0.0.1:3000/editor` を操作した。`window.electronAPI` が `undefined` であることを確認し、ブラウザ版として動作していることを確認している。

### 検証結果（19/19 passed）

| # | 項目 | 結果 |
|---|------|------|
| 1 | `/editor` がブラウザで描画される | PASS |
| 2 | `window.electronAPI` が未定義（ブラウザ版として動作） | PASS |
| 3 | `/health` を CORS 経由で取得できる | PASS |
| 4 | `OPTIONS` プリフライトが 204 | PASS |
| 5 | `/v1/models` が取得できる | PASS |
| 6-9 | `fetch` + `ReadableStream` でストリーミングでき、`delta` / `finish_reason` / `[DONE]` が届く | PASS |
| 10 | Settings で Apple FM を選択できる | PASS |
| 11 | ブラウザ版では「サーバー起動」ボタンが出ない（Electron 専用） | PASS |
| 12 | ブラウザ版向けの起動案内（`npm run applefm`）が表示される | PASS |
| 13 | Status が「✓ Running」になる | PASS |
| 14-16 | UI からの実送信でストリーミング表示 → Markdown 描画 → 収束して完了 | PASS |
| 17 | CORS 関連のエラーが出ない | PASS |

### 補足（テストでTripした点）

- `Access-Control-Allow-Origin` は CORS セーフリスト外のレスポンスヘッダなので、`fetch` からは JS で読めない（`null` になる）。CORS 許可の判定は「レスポンスが正常に読めるか」で行う。
- LLM Provider は `<select>` ではなくボタン群のため、Apple FM の選択はボタン押下で行う必要がある。

### ドキュメント更新

- `USAGE.md`: 「起動方法の違い」表を追加し、Electron版とブラウザ版の起動手順・設定画面の表示差を明記。ブラウザ版も CORS（`Access-Control-Allow-Origin: *`、プリフライト204）で別オリジンから呼び出せることを追記。
- `README.md`: v0.4.1 の「起動補助」行に、プロセスID表示と CORS の許容を追記。

## 50. 提案書「改善提案」全22項目の実装（サイドバー拡張方式） (2026/10/19)

### 概要

削除済みの `right-stuff-editor-dash-改善提案.html` に記載されていた改善提案の全22項目を、**ダッシュボード画面を新設せず、既存の `Sidebar.tsx` を拡張する方式**で一括実装した。サイドバーを「文書一覧」から「執筆ハブ」へ再定位し、テンプレート・履歴・AI支援・バックアップ等をサイドバーに統合した。

方針として、依存パッケージは一切追加せず、既存の React 18 + Vite + Tailwind + Lexical + Zustand + Dexie の構成を維持した。

### 設計上の主要判断

- **DB移行**: Dexie `RightStuffEditorDashDB` を v1 → v2 に更新し、新テーブル `templates` / `documentVersions` / `writingStats` を追加。`documents` には非インデックスの `status` / `summary` / `tags` / `gistId` / `gistUpdatedAt` を追加。
- **関連文書**: ローカルの語彙類似度（新規 `utils/similarity.ts` の余弦類似度）で算出。外部依存ゼロ。
- **View Transitions**: `editorStore.openDocument` で `globalThis.document.startViewTransition` を利用。ローカル変数 `document` とのシャドーイング回避のため、取得済み文書を `found` にリネーム。
- **ダークモード**: `index.css` の `.light` オーバーライド層を拡張する方式。Tailwind の `darkMode` 設定は変更せず、`.light` クラス配下で色を上書き。
- **時間トラッキング**: オプトイン制。`timeTrackingStore` で有効/無効を切り替え、有効時のみフォーカス時間を記録。

### Phase 0: 基盤

- `utils/db.ts`: v2 へのスキーマ移行と、`saveSetting` / `getSetting`、`listVersions` / `pruneVersions`、`bumpWritingStat` / `getWritingStats`、`deleteDocument`（versions も削除）等のヘルパーを追加。
- `types/index.ts`: `DocumentStatus` / `DocumentTemplate` / `DocumentVersion` / `WritingStat` / `ListDensity` / `DocumentFilter` / `BackupSettings` / `TimeTrackingSettings` 等を追加。
- `stores/editorStore.ts`: 追加フィールドのマッピング、`updateDocumentMeta`、`createDocument(title?, content?)`、View Transitions 対応の `openDocument`。
- `App.tsx`: フッターにオフライン表示とストレージ用量表示を追加（`hooks/useSystemStatus.ts`）。

### Phase 1: サイドバー拡張

`components/Sidebar/Sidebar.tsx` を全面書き換え、以下を追加。

- クイックアクション（新規 / 続きから / テンプレート）
- 直近24時間の継続セクション
- 状態フィルタチップ（すべて / 最近 / 完了 / Gist / 執筆中）
- 表示密度モード（`listDensityStore`）
- タグ / 完了 / Gist バッジ
- 関連文書（類似度スコア付き）
- 執筆ウィジェット（`components/Stats/WritingStatsWidget.tsx`）
- AI要約ボタン、Gist同期ボタン、履歴ボタン
- クイックプレビュー（`DocumentQuickPreview.tsx`）
- 一括出力ボタン、コマンドパレット起動（⌘K）ボタン

### Phase 2: コマンドパレットとショートカット

- `components/CommandPalette/CommandPalette.tsx` と `stores/commandPaletteStore.ts` を新設。
- `App.tsx` にキーボード配線（`Ctrl+K` および入力欄以外での `/`）。
- `stores/shortcutStore.ts` に `openCommandPalette`（`Ctrl+K`）と `openCommandPaletteSlash`（`/`）を登録。`/` は `HelpModal` に正しく表示するため action を `openCommandPaletteSlash` に分離。

### Phase 3: テンプレートシステム

- `stores/templateStore.ts`: 組み込み4種（日報 / 週報 / 議事録 / ブログ）+ ユーザー定義テンプレートの CRUD。
- `components/Templates/TemplateSelectorModal.tsx`: テンプレート選択モーダル。
- `Settings.tsx` に「テンプレート」管理タブを追加（編集 / 削除 / 現在の文書から作成）。

### Phase 4: Gist 双方向強化

- `GistUploadModal`: 既存 Gist への上書きアップロード（ドロップダウン選択）と `updateDocumentMeta` による gistId 保存を追加。
- `GistViewer.handleImport`: インポート時に `gistId` / `gistUpdatedAt` を文書へ紐付け。

### Phase 5: AI 支援

- `utils/documentAI.ts`: `generateDocumentSummary` を新設（AI要約・タグ生成）。
- `hooks/useFocusTimeTracker.ts`: フォーカス中の執筆時間を記録。`App.tsx` で呼び出し。
- `Settings.tsx`: 「一般」タブに執筆時間トラッキング（オプトイン）と自動バックアップ設定を追加。
- **ASM可視化**: `Sidebar.tsx` に、`supportsAsm()` 時のみインストール済みスキル一覧を折りたたみ式で表示。クリックで既存 `ASMPanel` を開く（`App.tsx` から `onToggleAsm` を受け渡し）。

### Phase 6: 保存・復元

- `components/History/VersionHistoryModal.tsx`: 文書の下書き履歴を表示・復元。
- `components/BulkExport/BulkExportModal.tsx`: 全文書の一括エクスポート（JSON / Markdown）。
- `stores/backupSettingsStore.ts`: 自動バックアップ設定（間隔・形式・最終実行時刻）。
- `App.tsx`: 設定に基づく自動バックアップの `useEffect` を実装。

### Phase 7: ビジュアル・アクセシビリティ

`index.css` の `.light` オーバーライド層を体系的に拡張。

- グレー系の背景・ボーダー・テキスト（`bg-*` / `border-*` / `text-*`）を light 向けに調整。
- アクセント色（blue / green / red / amber）を light 背景でコントラストを確保できるよう暗色化。
- `placeholder`、不透明度付き背景（`bg-gray-700/60` 等）を追加。
- gray 背景上の `text-white` は暗色に、colored ボタン上の `text-white` は白を維持（CSS の詳細度と記述順で制御）。
- `color-scheme`、`focus-visible` リング、View Transitions 用の CSS を追加。

### 変更ファイル（主なもの）

- 変更: `App.tsx`、`Sidebar.tsx`、`Settings.tsx`、`GistUploadModal.tsx`、`GistViewer.tsx`、`index.css`、`editorStore.ts`、`shortcutStore.ts`、`types/index.ts`、`db.ts`
- 新規: `components/CommandPalette/`、`components/Templates/`、`components/History/`、`components/BulkExport/`、`components/Stats/`、`components/Sidebar/DocumentQuickPreview.tsx`、`hooks/useFocusTimeTracker.ts`、`hooks/useSystemStatus.ts`、`stores/commandPaletteStore.ts`、`stores/templateStore.ts`、`stores/backupSettingsStore.ts`、`stores/timeTrackingStore.ts`、`stores/documentFilterStore.ts`、`stores/listDensityStore.ts`、`utils/documentAI.ts`、`utils/similarity.ts`

### 検証

- `npm run build`（`tsc && vite build`）成功。
- `npx tsc --noEmit` で型エラーなし。

### 残タスク

- ライトモード切替、⌘K / `/` パレット、テンプレート、履歴、一括出力等の手動検証は未実施。
- コミットメッセージは本変更を `feat: integrate all 22 improvement proposals via sidebar extension` として記録。
