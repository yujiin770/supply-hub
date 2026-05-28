import { useEffect, useState } from "react";

interface DocPreviewModalProps {
  fileUrl: string | null; // null → closed
  filename: string;
  onClose: () => void;
}

function isPdf(filename: string) {
  return filename.toLowerCase().endsWith(".pdf");
}

function isImage(filename: string) {
  return /\.(jpe?g|png|webp|gif)$/i.test(filename);
}

/**
 * Previews a KYC document inside a modal.
 *
 * - PDFs   → rendered in an <iframe> (no new tab, URL stays hidden)
 * - Images → rendered in an <img> tag
 * - Other  → unsupported message with download-only option
 *
 * "Download" fetches the file as a Blob and triggers a local save so the
 * signed URL never appears in the browser address bar.
 */
export default function DocPreviewModal({
  fileUrl,
  filename,
  onClose,
}: DocPreviewModalProps) {
  const [downloading, setDownloading] = useState(false);

  // Close on Escape
  useEffect(() => {
    if (!fileUrl) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [fileUrl, onClose]);

  if (!fileUrl) return null;

  async function handleDownload() {
    if (!fileUrl) return;
    setDownloading(true);
    try {
      const res = await fetch(fileUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex flex-col"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white shrink-0">
        <span className="text-sm font-medium truncate max-w-[60vw]">
          {filename}
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 disabled:opacity-50
                       text-white border border-white/20 px-3 py-1.5 rounded-lg transition-colors"
          >
            {downloading ? (
              "Downloading…"
            ) : (
              <>
                <span>↓</span> Download
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-xl leading-none px-2"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Preview area */}
      <div className="flex-1 overflow-hidden bg-slate-800 flex items-center justify-center">
        {isPdf(filename) ? (
          <iframe
            src={fileUrl}
            title={filename}
            className="w-full h-full border-0"
          />
        ) : isImage(filename) ? (
          <img
            src={fileUrl}
            alt={filename}
            className="max-w-full max-h-full object-contain p-4"
          />
        ) : (
          <div className="text-center text-white/70">
            <p className="mb-3 text-sm">
              Preview not available for this file type.
            </p>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="text-sm bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {downloading ? "Downloading…" : "Download File"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
