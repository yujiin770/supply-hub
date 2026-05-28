import { useState } from "react";

interface ReasonModalProps {
  isOpen: boolean;
  title: string;
  placeholder?: string;
  submitLabel?: string;
  minLength?: number;
  onSubmit: (value: string) => void | Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function ReasonModal({
  isOpen,
  title,
  placeholder = "Enter reason…",
  submitLabel = "Submit",
  minLength = 5,
  onSubmit,
  onCancel,
  loading = false,
}: ReasonModalProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  async function handleSubmit() {
    if (value.trim().length < minLength) {
      setError(`Please enter at least ${minLength} characters.`);
      return;
    }
    setError("");
    await onSubmit(value.trim());
    setValue("");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <h3 className="text-base font-semibold text-slate-900 mb-3">{title}</h3>
        <textarea
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError("");
          }}
          placeholder={placeholder}
          rows={4}
          className={`w-full rounded-lg border px-3 py-2 text-sm resize-none
                      focus:outline-none focus:ring-2 focus:ring-emerald-500
                      ${error ? "border-red-400 bg-red-50" : "border-slate-300"}`}
        />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        <div className="flex gap-3 justify-end mt-4">
          <button
            onClick={() => {
              onCancel();
              setValue("");
              setError("");
            }}
            className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300
                       rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700
                       disabled:opacity-50 rounded-lg transition-colors"
          >
            {loading ? "Submitting…" : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
