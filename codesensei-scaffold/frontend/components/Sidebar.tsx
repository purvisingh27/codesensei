"use client";

type SidebarProps = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
};

const navigation = [
  {
    name: "Overview",
    icon: "◈",
    description: "Repository summary",
  },
  {
    name: "Architecture",
    icon: "⌘",
    description: "System structure",
  },
  {
    name: "Setup",
    icon: "⚙",
    description: "Developer onboarding",
  },
  {
    name: "Ask",
    icon: "✦",
    description: "Repository Q&A",
  },
  {
    name: "First Task",
    icon: "◎",
    description: "Best first contribution",
  },
];

export default function Sidebar({
  activeTab,
  setActiveTab,
}: SidebarProps) {
  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-64 flex-col border-r border-white/10 bg-[#0a0f1d]">
      {/* Logo */}
      <div className="border-b border-white/10 px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400 text-lg font-black text-slate-950 shadow-lg shadow-cyan-400/20">
            CS
          </div>

          <div>
            <h1 className="text-lg font-bold tracking-tight">
              Code<span className="text-cyan-400">Sensei</span>
            </h1>

            <p className="text-[11px] text-slate-500">
              Repository Intelligence
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-3 py-6">
        <p className="px-3 pb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
          Workspace
        </p>

        <div className="space-y-1">
          {navigation.map((item) => {
            const active = activeTab === item.name;

            return (
              <button
                key={item.name}
                onClick={() => setActiveTab(item.name)}
                className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                  active
                    ? "bg-cyan-400/10 text-cyan-300"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                }`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm ${
                    active
                      ? "bg-cyan-400 text-slate-950"
                      : "bg-white/5 text-slate-500 group-hover:text-slate-300"
                  }`}
                >
                  {item.icon}
                </span>

                <span className="min-w-0">
                  <span className="block text-sm font-medium">
                    {item.name}
                  </span>

                  <span className="mt-0.5 block text-[10px] text-slate-600">
                    {item.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Backend status */}
      <div className="border-t border-white/10 p-4">
        <div className="rounded-xl border border-emerald-400/10 bg-emerald-400/5 p-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" />

            <span className="text-xs font-medium text-emerald-300">
              Backend Connected
            </span>
          </div>

          <p className="mt-2 text-[10px] leading-4 text-slate-600">
            FastAPI analysis engine is ready.
          </p>
        </div>

        <p className="mt-4 text-center text-[9px] text-slate-700">
          CodeSensei • IBM Bob 2.0
        </p>
      </div>
    </aside>
  );
}