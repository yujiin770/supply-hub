import { useRef, useState } from "react";
import React from "react";
import SupplierLayout from "../../layouts/supplier_layout";
import {
  useCatalogImports,
  useUploadCatalogImport,
  usePlImportJob,
  usePlImportDrafts,
  useTriggerExtract,
  useTriggerAiExtract,
  useSubmitAllDrafts,
  type CatalogImportRecord,
  type PlImportJobStatus,
  type PlImportJob,
} from "../../features/api_clients/import_api";
import {
  UploadCloud,
  FileSpreadsheet,
  History,
  Plus,
  FileText,
  AlertCircle,
  X,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    submitted: "bg-[#eaf7f2] text-[#00925d] border-[#c4e9db]",
    failed: "bg-rose-50 text-rose-700 border-rose-100",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold border tracking-wider uppercase ${
        styles[status] ?? "bg-slate-100 text-slate-700 border-slate-200"
      }`}
    >
      {status}
    </span>
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Upload zone ───────────────────────────────────────────────────────────────

function UploadZone({
  onFile,
  busy,
}: {
  onFile: (f: File) => void;
  busy: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
      className={`
        relative group cursor-pointer
        border-2 border-dashed rounded-[20px] 
        transition-all duration-300 ease-in-out
        flex flex-col items-center justify-center
        py-20 px-10
        ${
          drag
            ? "border-blue-500 bg-blue-50/50"
            : "border-gray-200 bg-gray-50/50 hover:border-blue-400 hover:bg-white hover:shadow-xl hover:shadow-blue-500/5"
        }
        ${busy ? "opacity-50 pointer-events-none" : "cursor-pointer"}
      `}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv,application/vnd.ms-excel"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />

      <div
        className={`
        p-5 rounded-2xl mb-6 transition-transform duration-300
        ${drag ? "scale-110 bg-blue-100 text-blue-600" : "bg-white text-gray-400 group-hover:text-blue-500 shadow-sm"}
      `}
      >
        <UploadCloud className="w-12 h-12" />
      </div>

      <div className="text-center">
        <p className="text-lg font-bold text-gray-900 mb-1">
          {busy ? (
            "Uploading…"
          ) : (
            <>
              Drop a CSV file here or{" "}
              <span className="text-blue-600">click to browse</span>
            </>
          )}
        </p>
        <div className="flex items-center justify-center gap-4 mt-3">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-gray-100 shadow-xs">
            CSV format
          </span>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-gray-100 shadow-xs">
            Max 10 MB
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Result banner ─────────────────────────────────────────────────────────────

function ResultBanner({ record }: { record: CatalogImportRecord }) {
  if (record.status === "submitted") {
    return (
      <div className="bg-[#eaf7f2] border border-[#c4e9db] text-[#00925d] rounded-2xl p-5 shadow-sm animate-fade-in">
        <p className="font-bold text-base mb-1">
          ✓ Import submitted successfully
        </p>
        <p className="text-sm font-medium">
          <span className="font-bold">{record.original_filename}</span> was
          forwarded to PharmaLake for processing.
        </p>
        {record.pharmalake_response && (
          <pre className="mt-4 text-xs bg-white/50 rounded-xl p-3 overflow-x-auto border border-[#c4e9db]/50 font-mono leading-relaxed">
            {JSON.stringify(record.pharmalake_response, null, 2)}
          </pre>
        )}
      </div>
    );
  }

  return (
    <div className="bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl p-5 shadow-sm animate-fade-in">
      <p className="font-bold text-base mb-1">✗ Import failed</p>
      <p className="text-sm font-medium">
        {record.error_message ?? "Unknown error from PharmaLake."}
      </p>
      {record.pharmalake_response && (
        <pre className="mt-4 text-xs bg-white/50 rounded-xl p-3 overflow-x-auto border border-rose-100/50 font-mono leading-relaxed">
          {JSON.stringify(record.pharmalake_response, null, 2)}
        </pre>
      )}
    </div>
  );
}

// ── Pipeline step helpers ─────────────────────────────────────────────────────

const PIPELINE_STEPS: PlImportJobStatus[] = [
  "UPLOADED",
  "EXTRACTING",
  "EXTRACTED",
  "AI_PROCESSING",
  "AI_PROCESSED",
  "SUBMITTING",
  "SUBMITTED",
];

const STEP_LABELS: Record<string, string> = {
  UPLOADED: "Uploaded",
  EXTRACTING: "Extracting",
  EXTRACTED: "Extracted",
  AI_PROCESSING: "AI Processing",
  AI_PROCESSED: "AI Done",
  SUBMITTING: "Submitting",
  SUBMITTED: "Submitted",
  FAILED: "Failed",
};

function PipelineSteps({ status }: { status: string }) {
  const current = PIPELINE_STEPS.indexOf(status as PlImportJobStatus);
  const isFailed = status === "FAILED";
  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-4 custom-scrollbar">
      {PIPELINE_STEPS.map((step, idx) => {
        const done = current > idx;
        const active = current === idx && !isFailed;
        return (
          <div key={step} className="flex items-center shrink-0">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
                  isFailed && idx === Math.max(current, 0)
                    ? "bg-rose-500 border-rose-500 text-white"
                    : done
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : active
                        ? "bg-blue-50 border-blue-500 text-blue-700"
                        : "bg-white border-gray-100 text-gray-300"
                }`}
              >
                {done ? "✓" : idx + 1}
              </div>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider mt-2 ${
                  active
                    ? "text-blue-600"
                    : done
                      ? "text-emerald-500"
                      : "text-gray-300"
                }`}
              >
                {STEP_LABELS[step]}
              </span>
            </div>
            {idx < PIPELINE_STEPS.length - 1 && (
              <div
                className={`h-0.5 w-8 mx-2 mb-5 shrink-0 rounded-full transition-all ${done ? "bg-emerald-500" : "bg-gray-100"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function DraftStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    READY: "bg-[#eaf7f2] text-[#00925d] border-[#c4e9db]",
    NEEDS_REVIEW: "bg-[#fffbeb] text-[#d97706] border-[#fef3c7]",
    BLOCKED: "bg-rose-50 text-rose-700 border-rose-100",
    APPROVED: "bg-blue-50 text-blue-800 border-blue-100",
    SUBMITTED: "bg-purple-50 text-purple-800 border-purple-100",
    IGNORED: "bg-slate-100 text-slate-500 border-slate-200",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold border tracking-wider uppercase ${
        styles[status] ?? "bg-slate-100 text-slate-700 border-slate-200"
      }`}
    >
      {status}
    </span>
  );
}

// ── Pipeline panel ────────────────────────────────────────────────────────────

function PipelinePanel({
  plImportId,
  filename,
  onClose,
}: {
  plImportId: string;
  filename: string;
  onClose: () => void;
}) {
  const [draftsSkip, setDraftsSkip] = useState(0);
  const DRAFTS_PAGE = 20;

  const { data: job, isLoading: jobLoading } = usePlImportJob(plImportId);
  const { data: drafts, isLoading: draftsLoading } = usePlImportDrafts(
    job && job.total_drafts > 0 ? plImportId : null,
    DRAFTS_PAGE,
    draftsSkip,
  );
  const extract = useTriggerExtract();
  const aiExtract = useTriggerAiExtract();
  const submitAll = useSubmitAllDrafts();

  const status = (job as PlImportJob | undefined)?.status ?? "UPLOADED";
  const aiStatus = job?.ai_status ?? "NOT_STARTED";
  const busy =
    extract.isPending ||
    aiExtract.isPending ||
    submitAll.isPending ||
    status === "EXTRACTING" ||
    status === "AI_PROCESSING" ||
    status === "SUBMITTING";

  const totalDraftPages = drafts ? Math.ceil(drafts.total / DRAFTS_PAGE) : 0;
  const currentDraftPage = Math.floor(draftsSkip / DRAFTS_PAGE) + 1;

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-8 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-800">
            Pipeline Details
          </h3>
          <p className="text-xs text-gray-400 font-bold uppercase mt-1 truncate max-w-lg">
            {filename}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors outline-none border-none bg-transparent cursor-pointer"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {jobLoading ? (
        <p className="text-sm text-slate-400 py-4 text-center">
          Loading pipeline status…
        </p>
      ) : job ? (
        <>
          <div className="overflow-x-auto pb-1">
            <PipelineSteps status={status} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {(
              [
                { label: "Status", value: status },
                { label: "AI", value: aiStatus },
                { label: "Sources", value: job.total_sources },
                { label: "Drafts", value: job.total_drafts },
                { label: "Ready", value: job.ready_count },
              ] as { label: string; value: string | number }[]
            ).map((item) => (
              <div
                key={item.label}
                className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-100"
              >
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                  {item.label}
                </p>
                <p className="text-sm font-bold text-gray-800 truncate">
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <div className="flex gap-3 flex-wrap">
            {status === "UPLOADED" && (
              <button
                disabled={busy}
                onClick={() => extract.mutate(plImportId)}
                className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50 border-none outline-none"
              >
                {extract.isPending ? "Extracting…" : "▶ Extract Columns"}
              </button>
            )}
            {(status === "EXTRACTED" || status === "AI_PROCESSED") && (
              <button
                disabled={busy}
                onClick={() => aiExtract.mutate(plImportId)}
                className="px-6 py-2.5 bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50 border-none outline-none"
              >
                {aiExtract.isPending ? "Starting AI…" : "✨ AI Extract"}
              </button>
            )}
            {status === "AI_PROCESSED" && job.ready_count > 0 && (
              <button
                disabled={busy}
                onClick={() => submitAll.mutate(plImportId)}
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/10 cursor-pointer disabled:opacity-50 border-none outline-none"
              >
                {submitAll.isPending
                  ? "Submitting…"
                  : `✓ Submit All (${job.ready_count})`}
              </button>
            )}
            {busy &&
              !extract.isPending &&
              !aiExtract.isPending &&
              !submitAll.isPending && (
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest self-center animate-pulse">
                  Processing…
                </span>
              )}
          </div>

          {job.total_drafts > 0 && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-gray-800">
                Extracted Drafts ({job.total_drafts})
              </h4>
              {draftsLoading ? (
                <p className="text-sm text-slate-400 text-center py-4">
                  Loading drafts…
                </p>
              ) : drafts && drafts.items.length > 0 ? (
                <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-gray-50/50 border-b border-gray-50">
                      <tr>
                        {[
                          "Status",
                          "Brand",
                          "Generic Name",
                          "Form",
                          "Strength",
                          "Pack Size",
                          "Barcode",
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-[10px] font-bold text-black uppercase tracking-widest"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {drafts.items.map((d) => (
                        <tr
                          key={d.draft_id}
                          className="hover:bg-gray-50/30 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <DraftStatusBadge status={d.status} />
                          </td>
                          <td className="px-4 py-3 text-gray-800 font-bold max-w-32 truncate">
                            {d.brand_name ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-gray-700 font-medium max-w-32 truncate">
                            {d.generic_name ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-gray-400 font-medium">
                            {d.dosage_form ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-gray-400 font-medium">
                            {d.strength ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-gray-400 font-medium">
                            {d.pack_size ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-gray-400 font-mono">
                            {d.barcode ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">
                  No drafts yet.
                </p>
              )}
              {totalDraftPages > 1 && (
                <div className="flex items-center justify-between pt-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Page {currentDraftPage} of {totalDraftPages}
                  </p>
                  <div className="flex gap-2">
                    <button
                      disabled={draftsSkip === 0}
                      onClick={() =>
                        setDraftsSkip(Math.max(0, draftsSkip - DRAFTS_PAGE))
                      }
                      className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-white text-[10px] font-bold transition-all disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                    >
                      Previous
                    </button>
                    <button
                      disabled={
                        draftsSkip + DRAFTS_PAGE >= (drafts?.total ?? 0)
                      }
                      onClick={() => setDraftsSkip(draftsSkip + DRAFTS_PAGE)}
                      className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-white text-[10px] font-bold transition-all disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-rose-500 font-bold">
          Could not load pipeline data.
        </p>
      )}
    </div>
  );
}

// ── History table ─────────────────────────────────────────────────────────────

function HistoryTable({
  items,
  onViewDetails,
}: {
  items: CatalogImportRecord[];
  onViewDetails: (plImportId: string, filename: string) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <div className="min-h-75 flex flex-col items-center justify-center p-10 text-center">
        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 border border-gray-100 shadow-inner">
          <FileText className="w-10 h-10 text-gray-200" />
        </div>

        <h3 className="text-xl font-bold text-gray-900">No imports yet.</h3>
        <p className="text-gray-400 font-medium mt-2 max-w-sm">
          When you upload product batches for review, your submission status and
          processing history will appear here.
        </p>

        <div className="mt-8 flex items-center gap-2 text-[11px] font-bold text-blue-500/60 uppercase tracking-widest">
          <AlertCircle className="w-3.5 h-3.5" />
          Data typically clears every 30 days
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="bg-gray-50/50 border-b border-gray-50">
            <th className="px-6 py-4 text-[10px] font-bold text-black uppercase tracking-widest">
              File
            </th>
            <th className="px-6 py-4 text-[10px] font-bold text-black uppercase tracking-widest">
              Status
            </th>
            <th className="px-6 py-4 text-[10px] font-bold text-black uppercase tracking-widest">
              PharmaLake code
            </th>
            <th className="px-6 py-4 text-[10px] font-bold text-black uppercase tracking-widest">
              Submitted
            </th>
            <th className="px-6 py-4" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {items.map((row) => (
            <React.Fragment key={row.id}>
              <tr className="hover:bg-gray-50/30 transition-colors">
                <td className="px-6 py-5 max-w-xs truncate text-gray-900 font-semibold text-sm">
                  {row.original_filename}
                </td>
                <td className="px-6 py-5">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-6 py-5 text-gray-500 font-mono text-xs font-bold">
                  {row.pharmalake_status_code ?? "—"}
                </td>
                <td className="px-6 py-5 text-gray-400 font-bold text-xs">
                  {fmtDate(row.created_at)}
                </td>
                <td className="px-6 py-5 text-right">
                  <div className="flex items-center justify-end gap-3">
                    {row.status === "submitted" &&
                      !!(row.pharmalake_response as Record<string, unknown>)
                        ?.import_id && (
                        <button
                          className="px-4 py-1.5 bg-white text-blue-600 hover:text-blue-700 text-xs font-bold rounded-lg border border-gray-200 hover:bg-gray-50 transition-all cursor-pointer outline-none"
                          onClick={() =>
                            onViewDetails(
                              String(
                                (
                                  row.pharmalake_response as Record<
                                    string,
                                    unknown
                                  >
                                ).import_id,
                              ),
                              row.original_filename,
                            )
                          }
                        >
                          View Details
                        </button>
                      )}
                    {(row.pharmalake_response || row.error_message) && (
                      <button
                        className="text-xs font-bold text-gray-400 hover:text-gray-600 bg-transparent border-none outline-none cursor-pointer"
                        onClick={() =>
                          setExpanded(expanded === row.id ? null : row.id)
                        }
                      >
                        {expanded === row.id ? "Hide" : "JSON"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
              {expanded === row.id && (
                <tr key={`${row.id}-detail`}>
                  <td colSpan={5} className="px-6 pb-5 pt-0">
                    {row.error_message && (
                      <p className="text-xs text-rose-600 font-bold mb-2">
                        {row.error_message}
                      </p>
                    )}
                    {row.pharmalake_response && (
                      <pre className="text-xs bg-gray-50/50 rounded-2xl p-4 overflow-x-auto border border-gray-100 font-mono leading-relaxed">
                        {JSON.stringify(row.pharmalake_response, null, 2)}
                      </pre>
                    )}
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export default function CatalogImportPage() {
  const [offset, setOffset] = useState(0);
  const [lastResult, setLastResult] = useState<CatalogImportRecord | null>(
    null,
  );
  const [selectedPlImportId, setSelectedPlImportId] = useState<string | null>(
    null,
  );
  const [selectedFilename, setSelectedFilename] = useState("");

  function handleViewDetails(plImportId: string, filename: string) {
    if (selectedPlImportId === plImportId) {
      setSelectedPlImportId(null);
    } else {
      setSelectedPlImportId(plImportId);
      setSelectedFilename(filename);
    }
  }

  const { data, isLoading } = useCatalogImports(PAGE_SIZE, offset);
  const upload = useUploadCatalogImport();

  async function handleFile(file: File) {
    setLastResult(null);
    try {
      const record = await upload.mutateAsync(file);
      setLastResult(record);
    } catch {
      // error surfaced via upload.error
    }
  }

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <SupplierLayout>
      <div className="space-y-8 pb-16 max-w-8xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">
            Import Missing Items
          </h1>
          <p className="text-base text-gray-500 font-medium mt-2 max-w-3xl">
            Upload a CSV of products that are missing from the PharmaLake master
            catalog. PharmaLake will review and approve each item before it
            becomes searchable.
          </p>
        </div>

        {/* Upload card */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-50 bg-gray-50/30">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-600" />
              Upload CSV
            </h2>
          </div>

          <div className="p-8 space-y-6">
            <UploadZone onFile={handleFile} busy={upload.isPending} />

            {upload.error && !lastResult && (
              <p className="text-sm text-rose-600 font-bold">
                {upload.error instanceof Error
                  ? upload.error.message
                  : "Upload failed. Please try again."}
              </p>
            )}

            {lastResult && <ResultBanner record={lastResult} />}

            {/* Template Download Help */}
            <div className="mt-8 flex items-center justify-center">
              <button className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-blue-600 transition-colors bg-transparent border-none outline-none cursor-pointer">
                <FileSpreadsheet className="w-4 h-4" />
                Download CSV Template
              </button>
            </div>
          </div>
        </div>

        {/* History */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-50 bg-gray-50/30">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600" />
              Import History
            </h2>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-20 space-y-4">
              <div className="w-10 h-10 border-4 border-gray-100 border-t-[#004797] rounded-full animate-spin"></div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Syncing Imports...
              </p>
            </div>
          ) : (
            <HistoryTable
              items={data?.items ?? []}
              onViewDetails={handleViewDetails}
            />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-8 py-5 bg-gray-50/40 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Page {currentPage} of {totalPages} · {data?.total} total
              </p>
              <div className="flex gap-2">
                <button
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-white text-[10px] font-bold transition-all disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                >
                  Previous
                </button>
                <button
                  disabled={offset + PAGE_SIZE >= (data?.total ?? 0)}
                  onClick={() => setOffset(offset + PAGE_SIZE)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-white text-[10px] font-bold transition-all disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Pipeline detail panel */}
        {selectedPlImportId && (
          <PipelinePanel
            plImportId={selectedPlImportId}
            filename={selectedFilename}
            onClose={() => setSelectedPlImportId(null)}
          />
        )}
      </div>
    </SupplierLayout>
  );
}
