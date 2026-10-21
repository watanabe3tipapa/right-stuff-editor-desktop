import React from "react";

interface LandingPageProps {
  onOpenEditor: () => void;
}

type IconName =
  | "arrow"
  | "check"
  | "chart"
  | "code"
  | "download"
  | "edit"
  | "eye"
  | "file"
  | "github"
  | "keyboard"
  | "lock"
  | "sparkles";

const Icon: React.FC<{ name: IconName; className?: string }> = ({
  name,
  className = "h-5 w-5",
}) => {
  const paths: Record<IconName, React.ReactNode> = {
    arrow: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />,
    check: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />,
    chart: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3v18h18M7 15l3-4 3 2 4-6" />,
    code: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l-3 3 3 3m8-6l3 3-3 3M14 5l-4 14" />,
    download: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3v12m0 0l4-4m-4 4l-4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />,
    edit: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />,
    eye: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />,
    file: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2zM12 14v-2m0 0V9m0 3h-2m2 0h2" />,
    github: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 2C6.48 2 2 6.58 2 12.23c0 4.52 2.87 8.35 6.84 9.71.5.1.68-.22.68-.49 0-.24-.01-1.04-.02-1.88-2.78.62-3.37-1.21-3.37-1.21-.46-1.2-1.11-1.51-1.11-1.51-.91-.64.07-.63.07-.63 1 .08 1.54 1.05 1.54 1.05.9 1.58 2.35 1.12 2.92.86.09-.67.35-1.12.64-1.38-2.22-.26-4.56-1.14-4.56-5.08 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.73 0 0 .84-.28 2.75 1.05a9.29 9.29 0 015 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.42.2 2.47.1 2.73.64.72 1.03 1.63 1.03 2.75 0 3.95-2.35 4.81-4.58 5.07.36.32.68.93.68 1.87 0 1.35-.01 2.43-.01 2.76 0 .27.18.59.69.49A10.25 10.25 0 0022 12.23C22 6.58 17.52 2 12 2z" />,
    keyboard: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 5h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V7a2 2 0 012-2zm3 4h.01M11 9h.01M15 9h.01M7 13h.01M11 13h.01M15 13h.01M8 16h8" />,
    lock: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 11V7a4 4 0 118 0v4m-9 0h10a1 1 0 011 1v7a1 1 0 01-1 1H7a1 1 0 01-1-1v-7a1 1 0 011-1z" />,
    sparkles: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3l1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3zm6.5 11.5l.7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7.7-2.3zM5.5 15l.7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7.7-2.3z" />,
  };

  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  );
};

const features = [
  {
    icon: "edit" as const,
    title: "書くことに、すぐ集中",
    body: "下線・打消し線・文字色・ハイライト・フォントサイズ、リンクや表・画像の挿入まで揃えたツールバー。リッチテキストと Markdown を行き来して書けます。",
  },
  {
    icon: "lock" as const,
    title: "保存状態がひと目でわかる",
    body: "変更・保存・失敗の状態を常に表示。文書はブラウザの端末内ストレージへ保存されます。",
  },
  {
    icon: "sparkles" as const,
    title: "書くそばに、AI を",
    body: "入力を止めると AI が続きを候補表示（Tab で採用）。テキスト選択時は「✨ AI」から校正・要約・翻訳などの変換を適用できます。Ollama や OpenAI 互換API、主要クラウドAPI、macOS標準の Apple Foundation Models など、計18種のLLMから選べます。",
  },
  {
    icon: "keyboard" as const,
    title: "打ちながら、整える",
    body: "行頭の「/」で見出し・リスト・表などをワンアクションで挿入。Zen モードとタイプライターモードで、書くことに集中できます。",
  },
  {
    icon: "github" as const,
    title: "GitHub Gist に、すぐ同期",
    body: "ワンクリックで文書を Gist に保存。Gist 一覧の閲覧・検索・インポートにも対応しています。",
  },
  {
    icon: "file" as const,
    title: "ローカルファイルへ、そのまま保存",
    body: "開いたファイルを編集して同じファイルへ上書き保存できます。未保存のまま閉じようとすると、離脱を検知してお知らせします。",
  },
  {
    icon: "eye" as const,
    title: "プレビューも、GitHubスタイルで",
    body: "GitHub Alerts、Mermaid図表、シンタックスハイライトに対応したプレビューで確認できます。Electron版ではmdvプレビューを別窓でも。",
  },
  {
    icon: "download" as const,
    title: "まとめて書き出し、自動で保険",
    body: "すべての文書を JSON / Markdown で一括エクスポート。設定した間隔で自動バックアップも開始し、作業を失いません。",
  },
  {
    icon: "chart" as const,
    title: "書く跡が、次の一手を助ける",
    body: "内容が近い関連文書をサイドバーに自動表示。AI要約で要点を素早く把握し、連続執筆日数や文字数の統計がモチベーションを支えます。",
  },
];

const LandingPage: React.FC<LandingPageProps> = ({ onOpenEditor }) => (
  <main className="min-h-screen overflow-x-hidden bg-slate-950 text-slate-100 selection:bg-blue-400/30">
    <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[42rem] overflow-hidden">
      <div className="absolute left-1/2 top-[-16rem] h-[38rem] w-[38rem] -translate-x-1/2 rounded-full bg-blue-500/20 blur-[120px]" />
      <div className="absolute right-[-10rem] top-24 h-80 w-80 rounded-full bg-indigo-500/15 blur-[100px]" />
    </div>

    <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 lg:px-8">
      <a href="/" className="group inline-flex items-center gap-2 rounded-md text-sm font-semibold tracking-tight text-white focus-visible:outline-none">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-blue-400 to-indigo-600 shadow-lg shadow-blue-500/20">
          <span className="font-serif text-lg italic">R</span>
        </span>
        <span>Right-Stuff Editor Dash</span>
      </a>
      <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex" aria-label="主なナビゲーション">
        <a className="transition-colors hover:text-white" href="#features">特徴</a>
        <a className="transition-colors hover:text-white" href="#workflow">使い方</a>
        <a className="transition-colors hover:text-white" href="#platforms">Web版とElectron版</a>
        <a
          className="inline-flex items-center gap-2 transition-colors hover:text-white"
          href="https://github.com/watanabe3tipapa/right-stuff-editor-dash"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub <span className="text-xs text-slate-500">↗</span>
        </a>
      </nav>
      <button type="button" onClick={onOpenEditor} className="rounded-lg bg-white px-3.5 py-2 text-sm font-semibold text-slate-950 transition-transform hover:-translate-y-0.5 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">
        ライブデモ
      </button>
    </header>

    <section className="relative z-10 mx-auto grid w-full max-w-6xl gap-12 px-5 pb-20 pt-16 lg:grid-cols-[.95fr_1.05fr] lg:items-center lg:px-8 lg:pb-28 lg:pt-24">
      <div className="max-w-2xl">
        <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1.5 text-sm font-medium text-blue-200">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-300" /> ローカルファーストの執筆環境
        </p>
        <h1 className="max-w-xl text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl lg:leading-[1.08]">
          思考を、途切れさせない。
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
          Right-Stuff Editor Dash は、Markdownの柔軟性とリッチテキストの手軽さをひとつにした、AI支援対応の編集環境です。書く、考える、整える。その流れをシンプルに保ちます。
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={onOpenEditor} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-5 py-3.5 font-semibold text-white shadow-lg shadow-blue-950/40 transition-all hover:-translate-y-0.5 hover:bg-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">
            デモを試す <Icon name="arrow" className="h-5 w-5" />
          </button>
          <a href="#workflow" className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 px-5 py-3.5 font-semibold text-slate-100 transition-colors hover:border-slate-500 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">
            できることを見る
          </a>
        </div>
        <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-400">
          <span className="inline-flex items-center gap-1.5"><Icon name="check" className="h-4 w-4 text-emerald-400" />端末内への自動保存</span>
          <span className="inline-flex items-center gap-1.5"><Icon name="check" className="h-4 w-4 text-emerald-400" />Markdown対応</span>
          <span className="inline-flex items-center gap-1.5"><Icon name="check" className="h-4 w-4 text-emerald-400" />AI 補完・インライン変換</span>
          <span className="inline-flex items-center gap-1.5"><Icon name="check" className="h-4 w-4 text-emerald-400" />Mermaid / KaTeX 対応</span>
          <span className="inline-flex items-center gap-1.5"><Icon name="check" className="h-4 w-4 text-emerald-400" />LLM 18種対応</span>
          <span className="inline-flex items-center gap-1.5"><Icon name="check" className="h-4 w-4 text-emerald-400" />GitHub Gist 連携</span>
          <span className="inline-flex items-center gap-1.5"><Icon name="check" className="h-4 w-4 text-emerald-400" />画像ドラッグ&ドロップ・貼り付け</span>
          <span className="inline-flex items-center gap-1.5"><Icon name="check" className="h-4 w-4 text-emerald-400" />Zen / タイプライターモード</span>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-2xl">
        <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-blue-500/20 via-indigo-500/10 to-transparent blur-2xl" />
        <div className="overflow-hidden rounded-2xl border border-slate-700/80 bg-[#111827] shadow-2xl shadow-black/40">
          <div className="flex items-center justify-between border-b border-slate-700 bg-slate-900 px-4 py-3">
            <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" /><span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" /></div>
            <span className="text-xs font-medium text-slate-400">Right-Stuff Editor Dash</span>
            <span className="h-3 w-12" />
          </div>
          <div className="grid min-h-[23rem] grid-cols-[9rem_1fr] sm:grid-cols-[11rem_1fr]">
            <aside className="border-r border-slate-700 bg-slate-900/70 p-3 sm:p-4">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300"><span>Documents</span><span className="text-blue-300">＋</span></div>
              <div className="mt-4 rounded-md border border-blue-400/20 bg-blue-400/10 p-2.5"><p className="truncate text-xs font-medium text-white">Project brief</p><p className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-400">書くことに集中できる、新しい編集環境。</p></div>
              <div className="mt-2 rounded-md p-2.5"><p className="text-xs font-medium text-slate-400">Ideas</p><p className="mt-1 text-[10px] text-slate-600">Yesterday</p></div>
            </aside>
            <div className="min-w-0 bg-[#17191f]">
              <div className="flex items-center gap-1 border-b border-slate-700 bg-[#20222a] px-3 py-2"><span className="rounded bg-slate-700 px-2 py-1 text-[10px] font-bold text-white">H1</span><span className="rounded px-2 py-1 text-[10px] font-bold text-slate-300">B</span><span className="rounded px-2 py-1 text-[10px] italic text-slate-300">I</span><span className="rounded px-2 py-1 text-[10px] font-bold text-slate-300 underline decoration-neutral-200 decoration-1 underline-offset-2">U</span><span className="rounded bg-slate-700 px-2 py-1 text-[10px] font-bold text-white">A</span><span className="rounded px-2 py-1 text-[10px] text-slate-300">🔗</span><span className="ml-auto rounded bg-blue-500/20 px-2 py-1 text-[10px] text-blue-200">Preview</span></div>
              <div className="p-5 sm:p-7"><p className="text-xs font-medium text-blue-300">PROJECT NOTE</p><h2 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">書くための、
                <br />静かな場所。</h2><p className="mt-4 max-w-sm text-xs leading-6 text-slate-400 sm:text-sm">余計な選択肢を減らし、文章とアイデアに集中できるワークスペースをつくります。</p><div className="mt-7 flex items-center gap-3 border-t border-slate-700 pt-4 text-[10px] text-slate-500"><span>Rich Text</span><span>1,024文字</span><span className="text-emerald-400">保存済み</span></div></div>
            </div>
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-slate-500">ライブデモでは、実際に編集・保存・表示切替を試せます。</p>
      </div>
    </section>

    <section id="features" className="relative z-10 border-y border-slate-800 bg-slate-900/40">
      <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8">
        <div className="max-w-2xl"><p className="text-sm font-semibold text-blue-300">DESIGNED FOR FLOW</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">必要な道具を、必要な場所に。</h2><p className="mt-4 leading-7 text-slate-400">機能を増やすのではなく、書く体験をなめらかにすることを優先しています。</p></div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {features.map((feature) => <article key={feature.title} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-6 transition-colors hover:border-slate-600"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-400/10 text-blue-300"><Icon name={feature.icon} /></span><h3 className="mt-5 text-lg font-semibold text-white">{feature.title}</h3><p className="mt-3 leading-7 text-sm text-slate-400">{feature.body}</p></article>)}
        </div>
      </div>
    </section>

    <section id="workflow" className="relative z-10 mx-auto max-w-6xl px-5 py-20 lg:px-8">
      <div className="grid gap-12 lg:grid-cols-[.85fr_1.15fr] lg:items-start"><div><p className="text-sm font-semibold text-blue-300">GET STARTED</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">数分で、書き始められる。</h2><p className="mt-4 max-w-md leading-7 text-slate-400">アカウント登録は不要です。デモを開けば、すぐに文章を作成できます。</p><button type="button" onClick={onOpenEditor} className="mt-7 inline-flex items-center gap-2 font-semibold text-blue-300 hover:text-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">ライブデモを開く <Icon name="arrow" className="h-5 w-5" /></button></div>
        <ol className="space-y-4">{[["01", "デモを開く", "最初の案内文を編集するか、新規文書を作成します。"], ["02", "自分らしく書く", "リッチテキストとMarkdownを、内容に合わせて切り替えます。"], ["03", "安心して続ける", "保存状態を確認しながら、端末内に文章を残せます。"]].map(([number, title, body]) => <li key={number} className="flex gap-5 rounded-2xl border border-slate-800 bg-slate-900/40 p-5"><span className="text-sm font-semibold text-blue-300">{number}</span><div><h3 className="font-semibold text-white">{title}</h3><p className="mt-1.5 text-sm leading-6 text-slate-400">{body}</p></div></li>)}</ol>
      </div>
    </section>

    <section id="platforms" className="relative z-10 border-y border-slate-800 bg-slate-900/40">
      <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8">
        <div className="max-w-2xl"><p className="text-sm font-semibold text-blue-300">WEB &amp; DESKTOP</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">使いたい形で、使える。</h2><p className="mt-4 leading-7 text-slate-400">Web版はインストール不要で、すぐ試せます。ブラウザで実際に動く機能だけを表示し、デスクトップならではのネイティブ機能はElectron版で加わります。</p></div>
        <div className="mt-10 grid gap-8 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-6">
            <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-400/10 text-blue-300"><Icon name="code" /></span><div><h3 className="text-lg font-semibold text-white">Web版</h3><p className="text-xs text-slate-500">インストール不要 · ブラウザですぐ試せる</p></div></div>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-400">
              <li className="flex items-start gap-2"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />リッチテキスト / Markdown の切替編集</li>
              <li className="flex items-start gap-2"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />AI 補完・スラッシュコマンド・インライン変換・AIチャット</li>
              <li className="flex items-start gap-2"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />文体プロファイル・エンティティメモリ</li>
              <li className="flex items-start gap-2"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />端末内の自動保存（IndexedDB）</li>
              <li className="flex items-start gap-2"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />GitHub Gist へのアップロード・閲覧</li>
              <li className="flex items-start gap-2"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />強化プレビュー（Alerts / Mermaid / KaTeX / ハイライト）</li>
              <li className="flex items-start gap-2"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />LLM 18種（Ollama / OpenAI / Anthropic / Gemini ほか）</li>
              <li className="flex items-start gap-2"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />ローカルファイルの読込・上書き保存<span className="text-xs text-slate-500">（Chrome / Edge のみ）</span></li>
              <li className="flex items-start gap-2"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />Apple Foundation Models<span className="text-xs text-slate-500">（macOS 26 以降 · 要ローカルサーバ）</span></li>
            </ul>
            <p className="mt-4 border-t border-slate-800 pt-3 text-xs leading-5 text-slate-500">ASM・mdv連携・OSターミナルはブラウザでは表示されません（Electron版のみ）。</p>
          </div>
          <div className="rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-600/10 to-transparent p-6">
            <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-400/10 text-blue-300"><Icon name="sparkles" /></span><div><h3 className="text-lg font-semibold text-white">Electron版<span className="ml-2 rounded bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-200">Desktop</span></h3><p className="text-xs text-slate-500">デスクトップ · ネイティブ機能が加わる</p></div></div>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-400">
              <li className="flex items-start gap-2"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />Web版のすべての機能</li>
              <li className="flex items-start gap-2"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />ローカルファイルの上書き保存<span className="text-xs text-slate-500">（OSダイアログ · ブラウザ不問）</span></li>
              <li className="flex items-start gap-2"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />mdv連携 — 高品質プレビューを別窓で表示</li>
              <li className="flex items-start gap-2"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />OSターミナル（実シェル · wterm + node-pty）</li>
              <li className="flex items-start gap-2"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />Agent Skill Manager（スキルの検索・インストール管理）</li>
              <li className="flex items-start gap-2"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />Apple Foundation Models — 設定画面からワンクリック起動</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <section className="relative z-10 mx-5 mb-16 rounded-3xl border border-blue-400/20 bg-gradient-to-br from-blue-600/25 via-indigo-700/20 to-slate-900 px-6 py-14 text-center lg:mx-auto lg:max-w-6xl lg:px-10"><div className="mx-auto max-w-2xl"><Icon name="keyboard" className="mx-auto h-7 w-7 text-blue-200" /><h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">次の一文を、ここから。</h2><p className="mt-4 leading-7 text-slate-300">まずはライブデモで、Right-Stuff Editor Dash の書き心地を確かめてください。</p><button type="button" onClick={onOpenEditor} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-slate-950 transition-transform hover:-translate-y-0.5 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900">デモを試す <Icon name="arrow" className="h-5 w-5" /></button></div></section>

    <footer className="relative z-10 border-t border-slate-800 px-5 py-8 text-sm text-slate-500"><div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:px-3"><span>Right-Stuff Editor Dash · v0.5.0</span><div className="flex items-center gap-4"><a className="inline-flex items-center gap-1.5 hover:text-slate-300" href="https://github.com/watanabe3tipapa/right-stuff-editor-dash" target="_blank" rel="noopener noreferrer"><Icon name="github" className="h-4 w-4" />GitHub</a><span>MIT License</span></div></div></footer>
  </main>
);

export default LandingPage;
