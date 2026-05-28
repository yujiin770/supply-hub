export interface StepDef {
  label: string;
  description?: string;
}

interface StepperProps {
  steps: StepDef[];
  /** 0-based index of the current active step. Steps before current are "done". */
  current: number;
}

export default function Stepper({ steps, current }: StepperProps) {
  return (
    <div className="w-full">
      <div className="flex items-start gap-0">
        {steps.map((step, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <div key={step.label} className="flex-1 flex flex-col items-center">
              {/* connector line + circle row */}
              <div className="flex items-center w-full">
                {/* left connector */}
                <div
                  className={`flex-1 h-0.5 ${i === 0 ? "invisible" : done ? "bg-emerald-500" : "bg-slate-200"}`}
                />
                {/* circle */}
                <div
                  className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold border-2 transition-colors
                    ${
                      done
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : active
                          ? "bg-white border-emerald-600 text-emerald-600 ring-4 ring-emerald-100"
                          : "bg-white border-slate-300 text-slate-400"
                    }`}
                >
                  {done ? (
                    <svg
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-4 h-4"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                {/* right connector */}
                <div
                  className={`flex-1 h-0.5 ${i === steps.length - 1 ? "invisible" : done ? "bg-emerald-500" : "bg-slate-200"}`}
                />
              </div>
              {/* label below */}
              <div className="mt-2 text-center px-1">
                <p
                  className={`text-xs font-semibold ${done || active ? "text-slate-900" : "text-slate-400"}`}
                >
                  {step.label}
                </p>
                {step.description && (
                  <p
                    className={`text-xs mt-0.5 ${active ? "text-slate-500" : "text-slate-400"}`}
                  >
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
