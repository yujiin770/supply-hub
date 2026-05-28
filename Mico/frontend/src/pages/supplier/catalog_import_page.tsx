import { useRef, useState } from "react";
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    submitted: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[status] ?? "bg-slate-100 text-slate-700"}`}
    >
      {status}
    </span>
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString();
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
      className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
        drag
          ? "border-blue-400 bg-blue-50"
          : "border-slate-300 hover:border-blue-400 bg-white"
      } ${busy ? "opacity-50 pointer-events-none" : "cursor-pointer"}`}
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
      <svg
        className="mx-auto h-10 w-10 text-slate-400 mb-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
        />
      </svg>
      <p className="text-sm font-medium text-slate-700">
        {busy ? "Uploading…" : "Drop a CSV file here or click to browse"}
      </p>
      <p className="text-xs text-slate-400 mt-1">CSV format · max 10 MB</p>
    </div>
  );
}

// ── Result banner ─────────────────────────────────────────────────────────────

function ResultBanner({ record }: { record: CatalogImportRecord }) {
  if (record.status === "submitted") {
    return (
      <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-800">
        <p className="font-semibold mb-1">✓ Import submitted successfully</p>
        <p>
          <span className="font-medium">{record.original_filename}</span> was
          forwarded to PharmaLake for processing.
        </p>
        {record.pharmalake_response && (
          <pre className="mt-2 text-xs bg-green-100 rounded p-2 overflow-x-auto">
            {JSON.stringify(record.pharmalake_response, null, 2)}
          </pre>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
      <p className="font-semibold mb-1">✗ Import failed</p>
      <p>{record.error_message ?? "Unknown error from PharmaLake."}</p>
      {record.pharmalake_response && (
        <pre className="mt-2 text-xs bg-red-100 rounded p-2 overflow-x-auto">
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
    <div className="flex items-center gap-0">
      {PIPELINE_STEPS.map((step, idx) => {
        const done = current > idx;
        const active = current === idx && !isFailed;
        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                  isFailed && idx === Math.max(current, 0)
                    ? "bg-red-500 border-red-500 text-white"
                    : done
                      ? "bg-blue-600 border-blue-600 text-white"
                      : active
                        ? "bg-blue-100 border-blue-500 text-blue-700"
                        : "bg-white border-slate-300 text-slate-400"
                }`}
              >
                {done ? "✓" : idx + 1}
              </div>
              <span
                className={`text-[10px] mt-1 whitespace-nowrap ${
                  active
                    ? "text-blue-700 font-semibold"
                    : done
                      ? "text-blue-600"
                      : "text-slate-400"
                }`}
              >
                {STEP_LABELS[step]}
              </span>
            </div>
            {idx < PIPELINE_STEPS.length - 1 && (
              <div
                className={`h-0.5 w-8 mx-1 mb-4 ${done ? "bg-blue-500" : "bg-slate-200"}`}
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
    READY: "bg-green-100 text-green-800",
    NEEDS_REVIEW: "bg-yellow-100 text-yellow-800",
    BLOCKED: "bg-red-100 text-red-700",
    APPROVED: "bg-blue-100 text-blue-800",
    SUBMITTED: "bg-purple-100 text-purple-800",
    IGNORED: "bg-slate-100 text-slate-500",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
        styles[status] ?? "bg-slate-100 text-slate-700"
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
    <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-800">
            Pipeline Details
          </h3>
          <p className="text-sm text-slate-500 mt-0.5 truncate max-w-lg">
            {filename}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 p-1 rounded"
        >
          ✕
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
                className="bg-slate-50 rounded-lg p-3 text-center"
              >
                <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                <p className="text-sm font-semibold text-slate-800 truncate">
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
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {extract.isPending ? "Extracting…" : "▶ Extract Columns"}
              </button>
            )}
            {(status === "EXTRACTED" || status === "AI_PROCESSED") && (
              <button
                disabled={busy}
                onClick={() => aiExtract.mutate(plImportId)}
                className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
              >
                {aiExtract.isPending ? "Starting AI…" : "✨ AI Extract"}
              </button>
            )}
            {status === "AI_PROCESSED" && job.ready_count > 0 && (
              <button
                disabled={busy}
                onClick={() => submitAll.mutate(plImportId)}
                className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
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
                <span className="text-sm text-slate-500 self-center">
                  Processing…
                </span>
              )}
          </div>

          {job.total_drafts > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-3">
                Extracted Drafts ({job.total_drafts})
              </h4>
              {draftsLoading ? (
                <p className="text-sm text-slate-400 text-center py-4">
                  Loading drafts…
                </p>
              ) : drafts && drafts.items.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-xs">
                    <thead className="bg-slate-50">
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
                            className="px-3 py-2 text-left font-semibold text-slate-600"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {drafts.items.map((d) => (
                        <tr key={d.draft_id} className="hover:bg-slate-50">
                          <td className="px-3 py-2">
                            <DraftStatusBadge status={d.status} />
                          </td>
                          <td className="px-3 py-2 text-slate-800 max-w-32 truncate">
                            {d.brand_name ?? "—"}
                          </td>
                          <td className="px-3 py-2 text-slate-700 max-w-32 truncate">
                            {d.generic_name ?? "—"}
                          </td>
                          <td className="px-3 py-2 text-slate-600">
                            {d.dosage_form ?? "—"}
                          </td>
                          <td className="px-3 py-2 text-slate-600">
                            {d.strength ?? "—"}
                          </td>
                          <td className="px-3 py-2 text-slate-600">
                            {d.pack_size ?? "—"}
                          </td>
                          <td className="px-3 py-2 text-slate-500 font-mono">
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
                  <p className="text-xs text-slate-500">
                    Page {currentDraftPage} of {totalDraftPages}
                  </p>
                  <div className="flex gap-2">
                    <button
                      disabled={draftsSkip === 0}
                      onClick={() =>
                        setDraftsSkip(Math.max(0, draftsSkip - DRAFTS_PAGE))
                      }
                      className="px-3 py-1 rounded border border-slate-200 text-xs disabled:opacity-40 hover:bg-slate-50"
                    >
                      Previous
                    </button>
                    <button
                      disabled={
                        draftsSkip + DRAFTS_PAGE >= (drafts?.total ?? 0)
                      }
                      onClick={() => setDraftsSkip(draftsSkip + DRAFTS_PAGE)}
                      className="px-3 py-1 rounded border border-slate-200 text-xs disabled:opacity-40 hover:bg-slate-50"
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
        <p className="text-sm text-red-500">Could not load pipeline data.</p>
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
      <p className="text-center text-sm text-slate-400 py-8">No imports yet.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-slate-600">
              File
            </th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600">
              Status
            </th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600">
              PharmaLake code
            </th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600">
              Submitted
            </th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-100">
          {items.map((row) => (
            <>
              <tr key={row.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 max-w-xs truncate text-slate-800 font-medium">
                  {row.original_filename}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {row.pharmalake_status_code ?? "—"}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {fmtDate(row.created_at)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    {row.status === "submitted" &&
                      !!(row.pharmalake_response as Record<string, unknown>)
                        ?.import_id && (
                        <button
                          className="text-xs text-blue-600 font-medium hover:underline"
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
                        className="text-xs text-slate-500 hover:underline"
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
                  <td colSpan={5} className="px-4 pb-3 pt-0">
                    {row.error_message && (
                      <p className="text-xs text-red-600 mb-2">
                        {row.error_message}
                      </p>
                    )}
                    {row.pharmalake_response && (
                      <pre className="text-xs bg-slate-50 rounded p-2 overflow-x-auto border border-slate-200">
                        {JSON.stringify(row.pharmalake_response, null, 2)}
                      </pre>
                    )}
                  </td>
                </tr>
              )}
            </>
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
      <div className="space-y-8 pb-16">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Import Missing Items
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Upload a CSV of products that are missing from the PharmaLake master
            catalog. PharmaLake will review and approve each item before it
            becomes searchable.
          </p>
        </div>

        {/* Upload card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-800">Upload CSV</h2>

          <UploadZone onFile={handleFile} busy={upload.isPending} />

          {upload.error && !lastResult && (
            <p className="text-sm text-red-600">
              {upload.error instanceof Error
                ? upload.error.message
                : "Upload failed. Please try again."}
            </p>
          )}

          {lastResult && <ResultBanner record={lastResult} />}
        </div>

        {/* History */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-800">
            Import History
          </h2>

          {isLoading ? (
            <p className="text-sm text-slate-400 py-8 text-center">Loading…</p>
          ) : (
            <HistoryTable
              items={data?.items ?? []}
              onViewDetails={handleViewDetails}
            />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-slate-500">
                Page {currentPage} of {totalPages} · {data?.total} total
              </p>
              <div className="flex gap-2">
                <button
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-40 hover:bg-slate-50"
                >
                  Previous
                </button>
                <button
                  disabled={offset + PAGE_SIZE >= (data?.total ?? 0)}
                  onClick={() => setOffset(offset + PAGE_SIZE)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-40 hover:bg-slate-50"
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
