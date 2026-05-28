import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "../../layouts/app_layout";
import {
  useMarketplaceSupplier,
  useSupplierPackages,
  type MarketplacePackage,
} from "../../features/api_clients/marketplace_api";
import type { CartItem } from "./marketplace_checkout_page";

const PAGE_SIZE = 20;

// ── Package detail drawer ─────────────────────────────────────────────────────

interface Ingredient {
  strength_value?: string | null;
  strength_unit_code?: string | null;
  substance_name?: string | null;
  description?: string | null;
}

function resolveStrengthLabel(pkg: MarketplacePackage): string {
  const parts: string[] = [];
  const ingredients = (pkg.ingredients ?? []) as Ingredient[];
  for (const ing of ingredients) {
    const val = ing.strength_value ?? "";
    const unit = ing.strength_unit_code ?? "";
    if (val) parts.push(`${val}${unit ? " " + unit : ""}`);
  }
  if (parts.length > 0) return parts.join(" / ");
  if (pkg.pack_qty_value)
    return `${parseFloat(pkg.pack_qty_value)}${pkg.pack_qty_unit_code ? " " + pkg.pack_qty_unit_code : ""}`;
  return "—";
}

// ── Qty stepper (inline in table) ───────────────────────────────────────────

function QtyCell({
  qty,
  onChange,
  disabled = false,
}: {
  qty: number;
  onChange: (q: number) => void;
  disabled?: boolean;
}) {
  if (qty === 0) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) onChange(1);
        }}
        disabled={disabled}
        className={`text-xs font-medium border rounded-lg px-2.5 py-1 whitespace-nowrap transition-colors ${
          disabled
            ? "text-slate-300 border-slate-200 bg-slate-50 cursor-not-allowed"
            : "text-emerald-700 border-emerald-300 bg-emerald-50 hover:bg-emerald-100"
        }`}
      >
        + Add
      </button>
    );
  }
  return (
    <div
      className="flex items-center gap-1"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => onChange(Math.max(0, qty - 1))}
        className="w-6 h-6 rounded border border-slate-300 text-slate-600 hover:bg-slate-100 text-sm font-bold leading-none"
      >
        −
      </button>
      <span className="w-7 text-center text-sm font-semibold text-slate-900">
        {qty}
      </span>
      <button
        onClick={() => onChange(qty + 1)}
        className="w-6 h-6 rounded border border-emerald-400 text-emerald-600 hover:bg-emerald-50 text-sm font-bold leading-none"
      >
        +
      </button>
    </div>
  );
}

function PackageDrawer({
  pkg,
  qty,
  onQtyChange,
  onClose,
}: {
  pkg: MarketplacePackage;
  qty: number;
  onQtyChange: (q: number) => void;
  onClose: () => void;
}) {
  const strength = resolveStrengthLabel(pkg);
  const ingredients = (pkg.ingredients ?? []) as Ingredient[];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Drawer panel */}
      <div className="relative z-10 w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-start justify-between gap-4 sticky top-0 bg-white z-10">
          <div className="min-w-0">
            <h2 className="font-semibold text-slate-900 text-lg leading-snug truncate">
              {pkg.brand_name ?? `Pack ${pkg.pack_id.slice(0, 8)}…`}
            </h2>
            {pkg.dosage_form_name && (
              <p className="text-xs text-slate-500 mt-0.5">
                {pkg.dosage_form_name}
                {pkg.route_name ? ` · ${pkg.route_name}` : ""}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-slate-400 hover:text-slate-700 text-xl font-bold leading-none mt-0.5"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-6 flex-1">
          {/* Pricing & terms */}
          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Pricing &amp; Terms
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-400 mb-0.5">Base Price</p>
                <p className="text-sm font-semibold text-slate-900">
                  {pkg.base_price
                    ? `₱ ${parseFloat(pkg.base_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                    : "—"}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-400 mb-0.5">MOQ</p>
                <p className="text-sm font-semibold text-slate-900">
                  {pkg.moq ? parseFloat(pkg.moq).toLocaleString() : "—"}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-400 mb-0.5">Lead Time</p>
                <p className="text-sm font-semibold text-slate-900">
                  {pkg.lead_time_days != null ? `${pkg.lead_time_days}d` : "—"}
                </p>
              </div>
            </div>
          </section>

          {/* Pack details */}
          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Pack Details
            </h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Strength</dt>
                <dd className="text-slate-900 font-medium text-right">
                  {strength}
                </dd>
              </div>
              {pkg.dosage_form_name && (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Form</dt>
                  <dd className="text-slate-900 font-medium">
                    {pkg.dosage_form_name}
                  </dd>
                </div>
              )}
              {pkg.route_name && (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Route</dt>
                  <dd className="text-slate-900 font-medium">
                    {pkg.route_name}
                  </dd>
                </div>
              )}
              {pkg.pack_qty_value && (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Pack Qty</dt>
                  <dd className="text-slate-900 font-medium">
                    {parseFloat(pkg.pack_qty_value)}{" "}
                    {pkg.pack_qty_unit_code ?? ""}
                  </dd>
                </div>
              )}
              {pkg.barcode && (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Barcode</dt>
                  <dd className="text-slate-900 font-mono text-xs">
                    {pkg.barcode}
                  </dd>
                </div>
              )}
              {pkg.sku && (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">SKU</dt>
                  <dd className="text-slate-900 font-mono text-xs">
                    {pkg.sku}
                  </dd>
                </div>
              )}
            </dl>
          </section>

          {/* Quantity stepper */}
          <section className="pt-2 border-t border-slate-100">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Quantity
            </h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onQtyChange(Math.max(0, qty - 1))}
                className="w-8 h-8 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 font-bold text-lg leading-none"
              >
                −
              </button>
              <span className="w-10 text-center font-semibold text-slate-900 text-lg">
                {qty}
              </span>
              <button
                onClick={() => onQtyChange(qty + 1)}
                className="w-8 h-8 rounded-lg border border-emerald-400 text-emerald-600 hover:bg-emerald-50 font-bold text-lg leading-none"
              >
                +
              </button>
              {qty > 0 && (
                <span className="text-xs text-emerald-600 font-medium ml-2">
                  In cart
                </span>
              )}
            </div>
          </section>

          {/* Ingredients */}
          {ingredients.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Active Ingredients
              </h3>
              <ul className="space-y-2">
                {ingredients.map((ing, i) => {
                  const name =
                    ing.description ??
                    ing.substance_name ??
                    `Ingredient ${i + 1}`;
                  const str = ing.strength_value
                    ? `${ing.strength_value}${ing.strength_unit_code ? " " + ing.strength_unit_code : ""}`
                    : null;
                  return (
                    <li
                      key={i}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-slate-700">{name}</span>
                      {str && (
                        <span className="text-xs font-medium text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5">
                          {str}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SupplierPackagesPage() {
  const { supplierId } = useParams<{ supplierId: string }>();
  const navigate = useNavigate();

  const [draftQ, setDraftQ] = useState("");
  const [q, setQ] = useState("");
  const [offset, setOffset] = useState(0);
  const [selectedPkg, setSelectedPkg] = useState<MarketplacePackage | null>(
    null,
  );
  // cart: listing_id → quantity
  const [cart, setCart] = useState<Record<string, number>>({});

  function setQty(listingId: string, qty: number) {
    setCart((prev) => {
      if (qty <= 0) {
        const next = { ...prev };
        delete next[listingId];
        return next;
      }
      return { ...prev, [listingId]: qty };
    });
  }

  function handleCheckout() {
    if (!supplierId || !data) return;
    const cartItems: CartItem[] = Object.entries(cart)
      .filter(([, q]) => q > 0)
      .map(([listingId, quantity]) => {
        const pkg = data.items.find((p) => p.listing_id === listingId);
        return {
          listing_id: listingId,
          quantity,
          brand_name: pkg?.brand_name ?? null,
          dosage_form_name: pkg?.dosage_form_name ?? null,
          base_price: pkg?.base_price ?? null,
        };
      });
    navigate("/marketplace/checkout", {
      state: {
        supplierId,
        cartItems,
        supplierName:
          supplier?.trade_name ?? supplier?.legal_name ?? "Supplier",
      },
    });
  }

  const { data: supplier } = useMarketplaceSupplier(supplierId);

  const { data, isLoading, isError } = useSupplierPackages(supplierId, {
    limit: PAGE_SIZE,
    offset,
    q: q || undefined,
    is_enabled: true,
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setOffset(0);
    setQ(draftQ.trim());
  }

  const cartCount = Object.values(cart).reduce((sum, q) => sum + q, 0);
  const cartLineCount = Object.keys(cart).length;
  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  const supplierName = supplier
    ? (supplier.trade_name ?? supplier.legal_name)
    : "Supplier";

  return (
    <AppLayout>
      {/* Drawer */}
      {selectedPkg && (
        <PackageDrawer
          pkg={selectedPkg}
          qty={cart[selectedPkg.listing_id] ?? 0}
          onQtyChange={(q) => setQty(selectedPkg.listing_id, q)}
          onClose={() => setSelectedPkg(null)}
        />
      )}

      <div className="space-y-6 pb-24">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-500">
          <button
            onClick={() => navigate("/marketplace/suppliers")}
            className="hover:text-emerald-600 font-medium"
          >
            Marketplace
          </button>
          <span>/</span>
          <span className="text-slate-900 font-medium truncate">
            {supplierName}
          </span>
        </nav>

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {supplierName}
            </h1>
            {supplier && (
              <p className="text-sm text-slate-500 mt-1">
                {[supplier.city, supplier.province].filter(Boolean).join(", ")}
                {supplier.supplier_code ? ` · ${supplier.supplier_code}` : ""}
              </p>
            )}
          </div>
          <button
            onClick={() => navigate("/orders/me")}
            className="text-xs text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            My Orders
          </button>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2 max-w-lg">
          <input
            type="text"
            value={draftQ}
            onChange={(e) => setDraftQ(e.target.value)}
            placeholder="Search by brand, barcode, SKU…"
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

        {/* Table */}
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-12 bg-slate-100 rounded-lg animate-pulse"
              />
            ))}
          </div>
        )}

        {isError && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            Failed to load packages. Please try again.
          </div>
        )}

        {data && !isLoading && (
          <>
            <p className="text-xs text-slate-400">
              {data.total} product{data.total !== 1 ? "s" : ""}
              {q ? ` matching "${q}"` : ""}
            </p>

            {data.items.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <p className="text-4xl mb-3">📦</p>
                <p className="font-medium">No products found</p>
                {q && (
                  <p className="text-sm mt-1">Try a different search term.</p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left border-b border-slate-200">
                      <th className="px-4 py-3 font-semibold text-slate-600">
                        Product
                      </th>
                      <th className="px-4 py-3 font-semibold text-slate-600">
                        Form / Route
                      </th>
                      <th className="px-4 py-3 font-semibold text-slate-600 text-right">
                        Base Price
                      </th>
                      <th className="px-4 py-3 font-semibold text-slate-600 text-right">
                        MOQ
                      </th>
                      <th className="px-4 py-3 font-semibold text-slate-600 text-right">
                        Lead Time
                      </th>
                      <th className="px-4 py-3 font-semibold text-slate-600 text-right">
                        Stock
                      </th>
                      <th className="px-4 py-3 font-semibold text-slate-600 text-right">
                        Qty
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.items.map((pkg) => {
                      const strength = resolveStrengthLabel(pkg);
                      const qty = cart[pkg.listing_id] ?? 0;
                      const isInCart = qty > 0;
                      return (
                        <tr
                          key={pkg.listing_id}
                          className={`transition-colors cursor-pointer ${
                            isInCart ? "bg-emerald-50/50" : "hover:bg-slate-50"
                          }`}
                          onClick={() => setSelectedPkg(pkg)}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {isInCart && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                              )}
                              <div>
                                <p className="font-medium text-slate-900 leading-snug">
                                  {pkg.brand_name ?? "—"}
                                </p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                  {strength}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {[pkg.dosage_form_name, pkg.route_name]
                              .filter(Boolean)
                              .join(" · ") || "—"}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-900 font-medium">
                            {pkg.base_price
                              ? `₱ ${parseFloat(pkg.base_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600">
                            {pkg.moq
                              ? parseFloat(pkg.moq).toLocaleString()
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600">
                            {pkg.lead_time_days != null
                              ? `${pkg.lead_time_days}d`
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {pkg.stock_qty === null ? (
                              <span className="text-xs text-slate-400">∞</span>
                            ) : pkg.stock_qty === 0 ? (
                              <span className="text-xs font-semibold text-red-500 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                                Out of Stock
                              </span>
                            ) : pkg.stock_qty <= 10 ? (
                              <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                                {pkg.stock_qty} left
                              </span>
                            ) : (
                              <span className="text-xs text-emerald-700">
                                {pkg.stock_qty.toLocaleString()}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <QtyCell
                              qty={qty}
                              disabled={pkg.stock_qty === 0}
                              onChange={(q) => setQty(pkg.listing_id, q)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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

      {/* Sticky cart bar */}
      {cartLineCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-emerald-200 shadow-xl px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {cartLineCount} product{cartLineCount !== 1 ? "s" : ""} selected
              <span className="text-slate-400 font-normal ml-2">
                ({cartCount} unit{cartCount !== 1 ? "s" : ""} total)
              </span>
            </p>
            <p className="text-xs text-slate-500 mt-0.5">From {supplierName}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCart({})}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Clear cart
            </button>
            <button
              onClick={handleCheckout}
              className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
            >
              Review Order →
            </button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
