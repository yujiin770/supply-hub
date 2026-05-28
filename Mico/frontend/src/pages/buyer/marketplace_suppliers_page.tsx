import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../../layouts/app_layout";
import {
  useMarketplaceSuppliers,
  type MarketplaceSupplier,
} from "../../features/api_clients/marketplace_api";

const PAGE_SIZE = 20;

function SupplierCard({
  supplier,
  onClick,
}: {
  supplier: MarketplaceSupplier;
  onClick: () => void;
}) {
  const displayName = supplier.trade_name ?? supplier.legal_name;
  const location = [supplier.city, supplier.province]
    .filter(Boolean)
    .join(", ");

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-slate-200 rounded-xl p-5 hover:border-emerald-400 hover:shadow-md transition-all group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900 group-hover:text-emerald-700 truncate text-base leading-snug">
            {displayName}
          </p>
          {supplier.trade_name &&
            supplier.trade_name !== supplier.legal_name && (
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {supplier.legal_name}
              </p>
            )}
          {location && (
            <p className="text-xs text-slate-400 mt-1">📍 {location}</p>
          )}
        </div>
        <span className="shrink-0 text-xs font-mono bg-slate-100 text-slate-500 rounded px-2 py-0.5">
          {supplier.supplier_code}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-full px-2.5 py-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
          Active
        </span>
      </div>
    </button>
  );
}

export default function MarketplaceSuppliersPage() {
  const navigate = useNavigate();
  const [draftQ, setDraftQ] = useState("");
  const [q, setQ] = useState("");
  const [offset, setOffset] = useState(0);

  const { data, isLoading, isError } = useMarketplaceSuppliers({
    limit: PAGE_SIZE,
    offset,
    q: q || undefined,
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setOffset(0);
    setQ(draftQ.trim());
  }

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Marketplace</h1>
          <p className="text-slate-500 text-sm mt-1">
            Browse approved suppliers and their product listings.
          </p>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex gap-2 max-w-lg">
          <input
            type="text"
            value={draftQ}
            onChange={(e) => setDraftQ(e.target.value)}
            placeholder="Search suppliers by name, city, province…"
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Search
          </button>
          {q && (
            <button
              type="button"
              onClick={() => {
                setDraftQ("");
                setQ("");
                setOffset(0);
              }}
              className="px-3 py-2 text-sm text-slate-500 border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Clear
            </button>
          )}
        </form>

        {/* Results */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white border border-slate-200 rounded-xl p-5 animate-pulse"
              >
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {isError && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            Failed to load suppliers. Please try again.
          </div>
        )}

        {data && !isLoading && (
          <>
            <p className="text-xs text-slate-400">
              {data.total} supplier{data.total !== 1 ? "s" : ""} found
              {q ? ` for "${q}"` : ""}
            </p>

            {data.items.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <p className="text-4xl mb-3">🏪</p>
                <p className="font-medium">No suppliers found</p>
                {q && (
                  <p className="text-sm mt-1">Try a different search term.</p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.items.map((s) => (
                  <SupplierCard
                    key={s.supplier_id}
                    supplier={s}
                    onClick={() =>
                      navigate(`/marketplace/suppliers/${s.supplier_id}`)
                    }
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                  disabled={offset === 0}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Previous
                </button>
                <span className="text-sm text-slate-500">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setOffset(offset + PAGE_SIZE)}
                  disabled={offset + PAGE_SIZE >= data.total}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
