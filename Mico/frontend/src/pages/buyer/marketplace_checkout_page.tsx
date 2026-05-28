import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AppLayout from "../../layouts/app_layout";
import { usePlaceOrder } from "../../features/api_clients/order_api";

// ── Types exported for use in packages page ───────────────────────────────────

export interface CartItem {
  listing_id: string;
  quantity: number;
  brand_name: string | null;
  dosage_form_name: string | null;
  base_price: string | null;
}

interface CheckoutState {
  supplierId: string;
  cartItems: CartItem[];
  supplierName: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MarketplaceCheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as CheckoutState | null;

  const [notes, setNotes] = useState("");
  const placeOrder = usePlaceOrder();

  // Guard — no cart state means user navigated here directly
  if (!state || !state.cartItems || state.cartItems.length === 0) {
    return (
      <AppLayout>
        <div className="text-center py-24 text-slate-400">
          <p className="text-4xl mb-3">🛒</p>
          <p className="font-medium text-slate-600">Your cart is empty.</p>
          <button
            onClick={() => navigate("/marketplace/suppliers")}
            className="mt-4 text-emerald-600 text-sm underline"
          >
            Browse suppliers
          </button>
        </div>
      </AppLayout>
    );
  }

  const { supplierId, cartItems, supplierName } = state;

  // Compute total (items with known price only)
  const computedTotal = cartItems.reduce((acc, item) => {
    if (!item.base_price) return acc;
    return acc + parseFloat(item.base_price) * item.quantity;
  }, 0);

  const hasKnownTotal = cartItems.some((i) => i.base_price !== null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    placeOrder.mutate(
      {
        supplier_id: supplierId,
        items: cartItems.map((i) => ({
          listing_id: i.listing_id,
          quantity: i.quantity,
        })),
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: (order) => {
          navigate(`/orders/me/${order.id}`, { replace: true });
        },
      },
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <nav className="flex items-center gap-2 text-sm text-slate-500 mb-4">
            <button
              onClick={() => navigate(-1)}
              className="hover:text-emerald-600 font-medium"
            >
              ← Back
            </button>
          </nav>
          <h1 className="text-2xl font-bold text-slate-900">Review Order</h1>
          <p className="text-sm text-slate-500 mt-1">
            Ordering from{" "}
            <span className="font-medium text-slate-700">{supplierName}</span>
          </p>
        </div>

        {/* Order items */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
            <h2 className="text-sm font-semibold text-slate-700">
              Order Items ({cartItems.length})
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {cartItems.map((item) => {
              const lineTotal =
                item.base_price !== null
                  ? parseFloat(item.base_price) * item.quantity
                  : null;
              return (
                <div
                  key={item.listing_id}
                  className="px-5 py-4 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {item.brand_name ??
                        `Listing ${item.listing_id.slice(0, 8)}…`}
                    </p>
                    {item.dosage_form_name && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        {item.dosage_form_name}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm text-slate-600">
                      {item.quantity} ×{" "}
                      {item.base_price
                        ? `₱ ${parseFloat(item.base_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                        : "—"}
                    </p>
                    {lineTotal !== null && (
                      <p className="text-sm font-semibold text-slate-900 mt-0.5">
                        ₱{" "}
                        {lineTotal.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total row */}
          {hasKnownTotal && (
            <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">
                Estimated Total
              </span>
              <span className="text-base font-bold text-slate-900">
                ₱{" "}
                {computedTotal.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          )}
        </div>

        {/* Notes + submit */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Notes{" "}
              <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Special instructions, delivery notes…"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          {placeOrder.isError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              Failed to place order. Please try again.
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 px-4 py-3 text-sm font-medium rounded-xl border border-slate-300 hover:bg-slate-50 transition-colors"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={placeOrder.isPending}
              className="flex-1 px-4 py-3 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {placeOrder.isPending ? "Placing Order…" : "Confirm Order"}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
