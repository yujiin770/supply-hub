import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../../layouts/app_layout";
import {
  useMyOrders,
  useCancelOrder,
  useRespondToOrder,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  type OrderOut,
  type OrderStatus,
} from "../../features/api_clients/order_api";

const PAGE_SIZE = 20;

const ALL_STATUSES: OrderStatus[] = [
  "PENDING",
  "AWAITING_CONFIRMATION",
  "CONFIRMED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function MyOrdersPage() {
  const navigate = useNavigate();
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const cancel = useCancelOrder();
  const respond = useRespondToOrder();

  const { data, isLoading, isError } = useMyOrders({
    limit: PAGE_SIZE,
    offset,
    status: statusFilter || undefined,
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Orders</h1>
            <p className="text-slate-500 text-sm mt-1">
              Track your purchase orders.
            </p>
          </div>
          <button
            onClick={() => navigate("/marketplace/suppliers")}
            className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
          >
            + New Order
          </button>
        </div>

        {/* Status filter tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setStatusFilter("");
              setOffset(0);
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              statusFilter === ""
                ? "bg-slate-900 text-white border-slate-900"
                : "border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            All
          </button>
          {ALL_STATUSES.map((s) => {
            const active = statusFilter === s;
            return (
              <button
                key={s}
                onClick={() => {
                  setStatusFilter(s);
                  setOffset(0);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  active
                    ? "bg-slate-900 text-white border-slate-900"
                    : "border-slate-300 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {ORDER_STATUS_LABELS[s]}
              </button>
            );
          })}
        </div>

        {/* List */}
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-20 bg-slate-100 rounded-xl animate-pulse"
              />
            ))}
          </div>
        )}

        {isError && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            Failed to load orders. Please refresh.
          </div>
        )}

        {data && !isLoading && (
          <>
            <p className="text-xs text-slate-400">
              {data.total} order{data.total !== 1 ? "s" : ""}
            </p>

            {data.items.length === 0 ? (
              <div className="text-center py-20 text-slate-400">
                <p className="text-4xl mb-3">📋</p>
                <p className="font-medium">No orders yet</p>
                <button
                  onClick={() => navigate("/marketplace/suppliers")}
                  className="mt-3 text-sm text-emerald-600 underline"
                >
                  Browse suppliers
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {data.items.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onView={() => navigate(`/orders/me/${order.id}`)}
                    onCancel={() => cancel.mutate(order.id)}
                    cancelling={cancel.isPending}
                    onRespond={(action, notes) =>
                      respond.mutate({
                        orderId: order.id,
                        data: { action, notes },
                      })
                    }
                    responding={respond.isPending}
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

function OrderCard({
  order,
  onView,
  onCancel,
  cancelling,
  onRespond,
  responding,
}: {
  order: OrderOut;
  onView: () => void;
  onCancel: () => void;
  cancelling: boolean;
  onRespond: (action: "confirm" | "cancel", notes?: string) => void;
  responding: boolean;
}) {
  const [notes, setNotes] = useState("");
  const itemCount = order.items.length;
  return (
    <div
      className={`bg-white border rounded-xl px-5 py-4 hover:border-slate-300 cursor-pointer transition-all ${
        order.status === "AWAITING_CONFIRMATION"
          ? "border-orange-300 ring-1 ring-orange-200"
          : "border-slate-200"
      }`}
      onClick={onView}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-900 text-sm">
              {order.order_number}
            </span>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-sm text-slate-600 mt-1 truncate">
            {order.supplier_name ?? "Unknown supplier"}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {itemCount} item{itemCount !== 1 ? "s" : ""} ·{" "}
            {formatDate(order.created_at)}
          </p>
        </div>
        <div className="text-right shrink-0">
          {order.total && (
            <p className="text-sm font-semibold text-slate-900">
              ₱{" "}
              {parseFloat(order.total).toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </p>
          )}
          {order.status === "PENDING" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCancel();
              }}
              disabled={cancelling}
              className="mt-2 text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
      {order.status === "AWAITING_CONFIRMATION" && (
        <div
          className="mt-3 rounded-lg bg-orange-50 border border-orange-200 px-3 py-3 space-y-2 text-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="font-semibold text-orange-700 text-xs">
            ⚠️ Supplier has modified this order
          </p>
          {order.supplier_edit_notes && (
            <p className="text-orange-800 text-xs">
              {order.supplier_edit_notes}
            </p>
          )}
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add a note or remark (optional)…"
            className="w-full text-xs border border-orange-200 bg-white rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => onRespond("confirm", notes || undefined)}
              disabled={responding}
              className="flex-1 px-3 py-1.5 text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {responding ? "Saving…" : "✔ Confirm Changes"}
            </button>
            <button
              onClick={() => onRespond("cancel", notes || undefined)}
              disabled={responding}
              className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
            >
              Cancel Order
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
