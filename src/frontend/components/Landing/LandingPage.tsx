import React from "react";

type IconName =
  | "arrow"
  | "check"
  | "download"
  | "file"
  | "github"
  | "history"
  | "lock"
  | "notes"
  | "sparkles"
  | "terminal";

const GITHUB_URL = "https://github.com/watanabe3tipapa/right-stuff-editor-desktop";
const RELEASES_URL = `${GITHUB_URL}/releases`;
const USAGE_URL = `${GITHUB_URL}/blob/main/docs/USAGE.md`;

const Icon: React.FC<{ name: IconName; className?: string }> = ({
  name,
  className = "h-5 w-5",
}) => {
  const paths: Record<IconName, React.ReactNode> = {
    arrow: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />,
    check: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />,
    download: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3v12m0 0l4-4m-4 4l-4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />,
    file: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2zM12 14v-2m0 0V9m0 3h-2m2 0h2" />,
    github: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 2C6.48 2 2 6.58 2 12.23c0 4.52 2.87 8.35 6.84 9.71.5.1.68-.22.68-.49 0-.24-.01-1.04-.02-1.88-2.78.62-3.37-1.21-3.37-1.21-.46-1.2-1.11-1.51-1.11-1.51-.91-.64.07-.63.07-.63 1 .08 1.54 1.05 1.54 1.05.9 1.58 2.35 1.12 2.92.86.09-.67.35-1.12.64-1.38-2.22-.26-4.56-1.14-4.56-5.08 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.73 0 0 .84-.28 2.75 1.05a9.29 9.29 0 015 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.42.2 2.47.1 2.73.64.72 1.03 1.63 1.03 2.75 0 3.95-2.35 4.81-4.58 5.07.36.32.68.93.68 1.87 0 1.35-.01 2.43-.01 2.76 0 .27.18.59.69.49A10.25 10.25 0 0022 12.23C22 6.58 17.52 2 12 2z" />,
    history: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8m0-5v5h5m4-1v4l3 2" />,
    lock: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 11V7a4 4 0 118 0v4m-9 0h10a1 1 0 011 1v7a1 1 0 01-1 1H7a1 1 0 01-1-1v-7a1 1 0 011-1z" />,
    notes: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2zm2 5h6M9 12h6M9 16h4" />,
    sparkles: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3l1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3zm6.5 11.5l.7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7.7-2.3zM5.5 15l.7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7.7-2.3z" />,
    terminal: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1zm3 5l3 2-3 2m5 0h4" />,
  };

  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  );
};

const features = [
  {
    icon: "file" as const,
    title: "ファイルが、原稿のまま",
    body: "ワークスペースの Markdown を直接読み書きします。frontmatter、サブフォルダ、他のエディタや Git との併用に対応。",
  },
  {
    icon: "notes" as const,
    title: "Apple Notes も、同じ画面で",
    body: "フォルダとノートを一覧し、本文を読み取り・更新。ロック済みや共有ノートは安全のため読み取り専用になります。",
  },
  {
    icon: "sparkles" as const,
    title: "書くそばに、AI を",
    body: "ゴーストテキスト、スラッシュコマンド、選択範囲の校正・要約・翻訳、AI チャット。18 種のプロバイダーから選択できます。",
  },
  {
    icon: "history" as const,
    title: "戻れる安心を、標準で",
    body: "保存ごとのバージョン履歴、15 秒間隔のリカバリ、定期バックアップ。原稿を失わないための仕組みを積み重ねています。",
  },
  {
    icon: "lock" as const,
    title: "端末の外へ、送らない",
    body: "アカウント登録、テレメトリ、クラウド同期はありません。原稿は選んだフォルダに残り、AI は明示的に接続した時だけ動きます。",
  },
  {
    icon: "terminal" as const,
    title: "書く場所で、そのまま実行",
    body: "macOS の PTY を wterm で表示。ワークスペースをカレントディレクトリにして、エディタを離れずに作業できます。",
  },
];

const workflow = [
  {
    step: "01",
    title: "フォルダを選ぶ",
    body: "既定の ~/Documents/Right-Stuff を使うか、原稿のあるフォルダをワークスペースに指定します。",
  },
  {
    step: "02",
    title: "書いて、整える",
    body: "リッチテキストと Markdown を切り替え、プレビューで確認。AI と Notes は必要なときだけ開きます。",
  },
  {
    step: "03",
    title: "そのまま残す",
    body: "変更は Markdown ファイルへ保存され、履歴とバックアップが端末内に積み重なります。",
  },
];

const LandingPage: React.FC = () => (
  <div className="min-h-screen overflow-x-hidden bg-slate-950 text-slate-100 selection:bg-blue-400/30">
    <div className="pointer-events-none fixed inset-x-0 top-0 -z-0 h-[42rem] overflow-hidden">
      <div className="absolute left-1/2 top-[-18rem] h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-blue-500/20 blur-[120px]" />
      <div className="absolute right-[-10rem] top-24 h-80 w-80 rounded-full bg-indigo-500/15 blur-[100px]" />
      <div className="absolute left-[-8rem] top-96 h-64 w-64 rounded-full bg-cyan-400/10 blur-[90px]" />
    </div>

    <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 lg:px-8">
      <a href="#top" className="group inline-flex items-center gap-2 rounded-md text-sm font-semibold tracking-tight text-white focus-visible:outline-none">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-blue-400 to-indigo-600 shadow-lg shadow-blue-500/20">
          <span className="font-serif text-lg italic">R</span>
        </span>
        <span>Right-Stuff Editor Desktop</span>
      </a>
      <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex" aria-label="Main navigation">
        <a className="transition-colors hover:text-white" href="#features">特徴</a>
        <a className="transition-colors hover:text-white" href="#workflow">使い方</a>
        <a className="transition-colors hover:text-white" href="#local-first">設計</a>
        <a
          className="inline-flex items-center gap-2 transition-colors hover:text-white"
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub <span className="text-xs text-slate-500">↗</span>
        </a>
      </nav>
      <a
        href={RELEASES_URL}
        className="rounded-lg bg-white px-3.5 py-2 text-sm font-semibold text-slate-950 transition-transform hover:-translate-y-0.5 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
      >
        ダウンロード
      </a>
    </header>

    <main id="top">
      <section className="relative z-10 mx-auto grid w-full max-w-6xl gap-12 px-5 pb-20 pt-16 lg:grid-cols-[.95fr_1.05fr] lg:items-center lg:px-8 lg:pb-28 lg:pt-24">
        <div className="max-w-2xl">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1.5 text-sm font-medium text-blue-200">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-300" /> macOS · local-first · tinyjs
          </p>
          <h1 className="max-w-xl text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl lg:leading-[1.08]">
            思考を、途切れさせない。
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
            Markdown の可搬性、リッチテキストの書き心地、Apple Notes と AI。
            right-stuff-editor-desktop は、原稿を端末のフォルダに残したまま、書くための道具をひとつにまとめます。
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href={RELEASES_URL}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-5 py-3.5 font-semibold text-white shadow-lg shadow-blue-950/40 transition-all hover:-translate-y-0.5 hover:bg-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              ダウンロード <Icon name="download" className="h-5 w-5" />
            </a>
            <a
              href={USAGE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-5 py-3.5 font-semibold text-slate-100 transition-colors hover:border-slate-500 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
            >
              使い方を見る <Icon name="arrow" className="h-5 w-5" />
            </a>
          </div>
          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-400">
            <span className="inline-flex items-center gap-1.5"><Icon name="check" className="h-4 w-4 text-emerald-400" />v0.1.0</span>
            <span className="inline-flex items-center gap-1.5"><Icon name="check" className="h-4 w-4 text-emerald-400" />MIT License</span>
            <span className="inline-flex items-center gap-1.5"><Icon name="check" className="h-4 w-4 text-emerald-400" />Apple Silicon</span>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-tr from-blue-500/20 via-indigo-500/10 to-transparent blur-2xl" />
          <div className="relative overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900/90 shadow-2xl shadow-slate-950/60 backdrop-blur">
            <div className="flex items-center gap-2 border-b border-slate-700/70 px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-300/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
              <span className="ml-3 truncate text-xs text-slate-400">Right-Stuff Editor Desktop — Workspace</span>
              <span className="ml-auto rounded-full border border-slate-700 px-2 py-0.5 text-[10px] text-slate-400">保存済み</span>
            </div>
            <div className="grid grid-cols-[9rem_1fr] sm:grid-cols-[11rem_1fr]">
              <div className="border-r border-slate-800 bg-slate-950/50 p-3 text-xs text-slate-400">
                <div className="mb-3 flex items-center justify-between text-slate-300">
                  <span className="font-semibold">Right-Stuff</span>
                  <span className="text-slate-600">+</span>
                </div>
                <div className="space-y-1.5">
                  <div className="rounded-md bg-blue-500/15 px-2 py-1.5 text-blue-200">Welcome.md</div>
                  <div className="px-2 py-1.5">essay.md</div>
                  <div className="px-2 py-1.5">notes/today.md</div>
                  <div className="px-2 py-1.5">drafts/idea.md</div>
                </div>
                <div className="mt-6 space-y-1.5 border-t border-slate-800 pt-3">
                  <div className="px-2 py-1.5">Apple Notes</div>
                  <div className="px-2 py-1.5">Terminal</div>
                  <div className="px-2 py-1.5">History</div>
                </div>
              </div>
              <div className="p-5 sm:p-7">
                <div className="mb-5 flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  <span className="rounded border border-slate-700 px-1.5 py-1">H1</span>
                  <span className="rounded border border-slate-700 px-1.5 py-1">B</span>
                  <span className="rounded border border-slate-700 px-1.5 py-1 italic">I</span>
                  <span className="rounded border border-slate-700 px-1.5 py-1">Link</span>
                  <span className="ml-auto text-slate-600">Markdown</span>
                </div>
                <h2 className="text-2xl font-semibold tracking-tight text-white">次の一文を、ここから。</h2>
                <p className="mt-4 text-sm leading-7 text-slate-300">
                  原稿は Markdown ファイルとして保存されます。書きながら履歴が残り、
                  必要なときだけ AI と Notes を呼び出せます。
                </p>
                <div className="mt-5 space-y-2 text-sm text-slate-400">
                  <p className="flex gap-2"><span className="text-blue-300">—</span> ワークスペースを開く</p>
                  <p className="flex gap-2"><span className="text-blue-300">—</span> 書いて、整える</p>
                  <p className="flex gap-2"><span className="text-blue-300">—</span> そのまま残す</p>
                </div>
                <div className="mt-7 rounded-lg border border-blue-400/20 bg-blue-400/5 p-3 text-xs text-blue-100/80">
                  <span className="font-semibold text-blue-200">AI</span> 入力を止めると、続きを候補表示。Tab で採用できます。
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 border-t border-slate-800 px-4 py-2 text-[10px] text-slate-500">
              <span>Markdown</span>
              <span>1,248 文字</span>
              <span className="ml-auto text-emerald-400">保存済み · たった今</span>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="relative z-10 mx-auto w-full max-w-6xl px-5 py-16 lg:px-8 lg:py-24">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-300">Features</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">書くための道具を、ひとつに。</h2>
          <p className="mt-4 leading-7 text-slate-400">
            エディタ、Notes、AI、履歴、ターミナル。行き来していたものを、ローカルのワークスペースにまとめました。
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className="group rounded-2xl border border-slate-800 bg-slate-900/50 p-6 transition-colors hover:border-slate-600 hover:bg-slate-900">
              <div className="grid h-10 w-10 place-items-center rounded-xl border border-blue-400/20 bg-blue-400/10 text-blue-200">
                <Icon name={feature.icon} />
              </div>
              <h3 className="mt-5 font-semibold text-white">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="workflow" className="relative z-10 mx-auto w-full max-w-6xl px-5 py-16 lg:px-8 lg:py-24">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-300">Workflow</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">数分で、書き始められる。</h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {workflow.map((item) => (
              <div key={item.step} className="border-t border-slate-700 pt-5">
                <span className="font-mono text-xs text-blue-300">{item.step}</span>
                <h3 className="mt-3 text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="local-first" className="relative z-10 mx-auto grid w-full max-w-6xl gap-4 px-5 py-16 md:grid-cols-2 lg:px-8 lg:py-24">
        <article className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8">
          <Icon name="lock" className="h-7 w-7 text-emerald-300" />
          <h2 className="mt-5 text-2xl font-semibold text-white">原稿は、端末の中に。</h2>
          <p className="mt-3 leading-7 text-slate-400">
            選んだフォルダが保存先です。アカウントも同期もテレメトリもなく、他のエディタや Git からそのまま扱えます。
            AI は設定したプロバイダーへ接続した時だけ動作します。
          </p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8">
          <Icon name="history" className="h-7 w-7 text-blue-300" />
          <h2 className="mt-5 text-2xl font-semibold text-white">壊さないための仕組み。</h2>
          <p className="mt-3 leading-7 text-slate-400">
            一時ファイル + rename の atomic write、外部変更の競合検知、ゴミ箱への退避、
            バージョン履歴、15 秒ごとのリカバリ、定期バックアップ。原稿を守る機能を標準で備えています。
          </p>
        </article>
      </section>

      <section className="relative z-10 mx-5 mb-16 rounded-3xl border border-blue-400/20 bg-gradient-to-br from-blue-600/25 via-indigo-700/20 to-slate-900 px-6 py-14 text-center lg:mx-auto lg:max-w-6xl lg:px-10">
        <div className="mx-auto max-w-2xl">
          <Icon name="sparkles" className="mx-auto h-7 w-7 text-blue-200" />
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">次の一文を、ここから。</h2>
          <p className="mt-4 leading-7 text-slate-300">
            right-stuff-editor-desktop は macOS 向けのデスクトップアプリです。リポジトリからビルドして、自分のワークスペースで始められます。
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <a href={RELEASES_URL} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-slate-950 transition-transform hover:-translate-y-0.5 hover:bg-blue-50">
              ダウンロード <Icon name="download" className="h-5 w-5" />
            </a>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-600 px-5 py-3 font-semibold text-white transition-colors hover:border-slate-400 hover:bg-white/5">
              <Icon name="github" className="h-5 w-5" /> GitHub
            </a>
          </div>
        </div>
      </section>
    </main>

    <footer className="relative z-10 border-t border-slate-800 px-5 py-8 text-sm text-slate-500">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span>Right-Stuff Editor Desktop · v0.1.0 · MIT License</span>
        <div className="flex items-center gap-4">
          <a className="inline-flex items-center gap-1.5 hover:text-slate-300" href={USAGE_URL} target="_blank" rel="noopener noreferrer">Docs</a>
          <a className="inline-flex items-center gap-1.5 hover:text-slate-300" href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
            <Icon name="github" className="h-4 w-4" />GitHub
          </a>
        </div>
      </div>
    </footer>
  </div>
);

export default LandingPage;
