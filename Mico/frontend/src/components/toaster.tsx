import { useToastStore } from "../lib/toast";

const colors = {
  success: "bg-emerald-500",
  error: "bg-red-500",
  warning: "bg-amber-500",
  info: "bg-blue-500",
};

const icons = {
  success: "✓",
  error: "✕",
  warning: "⚠",
  info: "ℹ",
};

export default function Toaster() {
  const { toasts, dismiss } = useToastStore();

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-3 rounded-xl px-4 py-3 shadow-lg text-white text-sm
                      animate-in slide-in-from-bottom-2 ${colors[t.type]}`}
        >
          <span className="shrink-0 font-bold text-base leading-5">
            {icons[t.type]}
          </span>
          <span className="flex-1 leading-5">{t.message}</span>
          <button
            onClick={() => dismiss(t.id)}
            className="shrink-0 opacity-70 hover:opacity-100 font-bold leading-5"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
