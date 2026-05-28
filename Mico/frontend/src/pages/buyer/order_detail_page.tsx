import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "../../layouts/app_layout";
import {
  useMyOrder,
  useCancelOrder,
  useRespondToOrder,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  type OrderStatus,
} from "../../features/api_clients/order_api";

function StatusBadge({ status }: { status: OrderStatus }) {
  const { bg, text } = ORDER_STATUS_COLORS[status] ?? {
    bg: "bg-slate-100",
    text: "text-slate-600",
  };
  return (
    <span
      className={`inline-flex items-center text-xs font-semibold rounded-full px-2.5 py-0.5 ${bg} ${text}`}
    >
      {ORDER_STATUS_LABELS[status] ?? status}
    </span>
  );
}

const STATUS_STEPS: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "SHIPPED",
  "DELIVERED",
];

function OrderProgressBar({ status }: { status: OrderStatus }) {
  if (status === "CANCELLED") {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-sm">
        <span className="text-red-400">✗</span> Order cancelled
      </div>
    );
  }
  if (status === "AWAITING_CONFIRMATION") {
    return (
      <div className="flex items-center gap-2 text-orange-600 text-sm">
        <span className="text-orange-500">⏳</span>
        <span className="font-medium">
          Awaiting your confirmation of supplier changes
        </span>
      </div>
    );
  }
  const currentIdx = STATUS_STEPS.indexOf(status);
  return (
    <div className="flex items-center gap-0">
      {STATUS_STEPS.map((step, i) => {
        const done = i <= currentIdx;
        const current = i === currentIdx;
        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors ${
                  done
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-slate-200 bg-white text-slate-400"
                } ${current ? "ring-2 ring-emerald-200 ring-offset-1" : ""}`}
              >
                {done ? "✓" : i + 1}
              </div>
              <span
                className={`text-xs mt-1 whitespace-nowrap ${
                  done ? "text-emerald-600 font-medium" : "text-slate-400"
                }`}
              >
                {ORDER_STATUS_LABELS[step]}
              </span>
            </div>
            {i < STATUS_STEPS.length - 1 && (
              <div
                className={`h-0.5 w-12 mx-1 mb-4 transition-colors ${
                  i < currentIdx ? "bg-emerald-400" : "bg-slate-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading, isError } = useMyOrder(orderId);
  const cancel = useCancelOrder();
  const respond = useRespondToOrder();
  const [respondNotes, setRespondNotes] = useState("");

  if (isLoading) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-1/3" />
          <div className="h-32 bg-slate-100 rounded-xl" />
          <div className="h-48 bg-slate-100 rounded-xl" />
        </div>
      </AppLayout>
    );
  }

  if (isError || !order) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto text-center py-20 text-slate-400">
          <p className="text-4xl mb-3">❌</p>
          <p className="font-medium">Order not found.</p>
          <button
            onClick={() => navigate("/orders/me")}
            className="mt-4 text-emerald-600 text-sm underline"
          >
            Back to My Orders
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-500">
          <button
            onClick={() => navigate("/orders/me")}
            className="hover:text-emerald-600 font-medium"
          >
            My Orders
          </button>
          <span>/</span>
          <span className="text-slate-900 font-mono">{order.order_number}</span>
        </nav>

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">
                {order.order_number}
              </h1>
              <StatusBadge status={order.status} />
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Supplier:{" "}
              <span className="font-medium">{order.supplier_name ?? "—"}</span>
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Placed {formatDate(order.created_at)}
            </p>
          </div>
          {order.status === "PENDING" && (
            <button
              onClick={() =>
                cancel.mutate(order.id, {
                  onSuccess: () => navigate("/orders/me"),
                })
              }
              disabled={cancel.isPending}
              className="text-sm text-red-500 hover:text-red-700 font-medium border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 disabled:opacity-50"
            >
              Cancel Order
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="bg-white border border-slate-200 rounded-xl px-6 py-5">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Fulfilment Status
          </h2>
          <OrderProgressBar status={order.status} />
        </div>

        {/* Order items */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
            <h2 className="text-sm font-semibold text-slate-700">
              Items ({order.items.length})
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {order.items.map((item) => {
              const subtotal =
                item.subtotal !== null ? parseFloat(item.subtotal) : null;
              return (
                <div
                  key={item.id}
                  className="px-5 py-4 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {item.brand_name ?? `Pack ${item.pack_id.slice(0, 8)}…`}
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
                      {item.unit_price
                        ? `₱ ${parseFloat(item.unit_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                        : "—"}
                    </p>
                    {subtotal !== null && (
                      <p className="text-sm font-semibold text-slate-900 mt-0.5">
                        ₱{" "}
                        {subtotal.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {order.total && (
            <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">
                Total
              </span>
              <span className="text-base font-bold text-slate-900">
                ₱{" "}
                {parseFloat(order.total).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          )}
        </div>

        {/* Notes */}
        {order.notes && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1">
              Notes
            </p>
            <p className="text-sm text-amber-900">{order.notes}</p>
          </div>
        )}

        {/* Supplier edit — action required */}
        {order.status === "AWAITING_CONFIRMATION" && (
          <div className="bg-orange-50 border border-orange-300 rounded-xl px-5 py-4 space-y-3">
            <div>
              <p className="text-sm font-semibold text-orange-700">
                ⚠️ Supplier has modified this order
              </p>
              {order.supplier_edit_notes && (
                <p className="text-sm text-orange-800 mt-1">
                  {order.supplier_edit_notes}
                </p>
              )}
              <p className="text-xs text-orange-600 mt-2">
                Please review the updated items above and confirm or cancel the
                order.
              </p>
            </div>
            <div>
              <label className="text-xs font-semibold text-orange-600 uppercase tracking-wider">
                Your remarks (optional)
              </label>
              <textarea
                rows={2}
                value={respondNotes}
                onChange={(e) => setRespondNotes(e.target.value)}
                placeholder="Add a note about your decision…"
                className="mt-1 w-full text-sm border border-orange-200 bg-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  respond.mutate(
                    {
                      orderId: order.id,
                      data: {
                        action: "confirm",
                        notes: respondNotes || undefined,
                      },
                    },
                    { onSuccess: () => navigate("/orders/me") },
                  )
                }
                disabled={respond.isPending}
                className="px-4 py-2 text-sm font-semibold bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {respond.isPending ? "Saving…" : "✔ Confirm Changes"}
              </button>
              <button
                onClick={() =>
                  respond.mutate(
                    {
                      orderId: order.id,
                      data: {
                        action: "cancel",
                        notes: respondNotes || undefined,
                      },
                    },
                    { onSuccess: () => navigate("/orders/me") },
                  )
                }
                disabled={respond.isPending}
                className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
              >
                Cancel Order
              </button>
            </div>
          </div>
        )}

        {/* Buyer response notes (if set) */}
        {order.buyer_response_notes && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Your Response Note
            </p>
            <p className="text-sm text-slate-700">
              {order.buyer_response_notes}
            </p>
          </div>
        )}

        {/* Timestamp */}
        <p className="text-xs text-slate-400 text-center pb-4">
          Last updated {formatDate(order.updated_at)}
        </p>
      </div>
    </AppLayout>
  );
}
