/**
 * Typed API client for order endpoints (buyer + supplier).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosClient, getAxiosErrorMessage } from "../../lib/axios_client";
import { toast } from "../../lib/toast";

// ── Types ─────────────────────────────────────────────────────────────────────

export type OrderStatus =
  | "PENDING"
  | "AWAITING_CONFIRMATION"
  | "AWAITING_PAYMENT"
  | "CONFIRMED"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Pending",
  AWAITING_CONFIRMATION: "Awaiting Your Confirmation",
  AWAITING_PAYMENT: "Awaiting Payment",
  CONFIRMED: "Confirmed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export const ORDER_STATUS_COLORS: Record<
  OrderStatus,
  { bg: string; text: string }
> = {
  PENDING: { bg: "bg-amber-50", text: "text-amber-700" },
  AWAITING_CONFIRMATION: { bg: "bg-orange-50", text: "text-orange-700" },
  AWAITING_PAYMENT: { bg: "bg-sky-50", text: "text-sky-700" },
  CONFIRMED: { bg: "bg-blue-50", text: "text-blue-700" },
  SHIPPED: { bg: "bg-purple-50", text: "text-purple-700" },
  DELIVERED: { bg: "bg-emerald-50", text: "text-emerald-700" },
  CANCELLED: { bg: "bg-slate-100", text: "text-slate-500" },
};

export interface OrderItemCreate {
  listing_id: string;
  quantity: number;
}

export interface OrderCreate {
  supplier_id: string;
  items: OrderItemCreate[];
  notes?: string;
}

export interface OrderEditItem {
  pack_id: string;
  quantity: number;
}

export interface OrderEdit {
  items: OrderEditItem[];
  supplier_edit_notes: string;
}

export interface BuyerOrderRespond {
  action: "confirm" | "cancel";
  notes?: string;
}

export interface OrderItemOut {
  id: string;
  order_id: string;
  listing_id: string;
  pack_id: string;
  brand_name: string | null;
  dosage_form_name: string | null;
  quantity: number;
  unit_price: string | null;
  subtotal: string | null;
}

export interface OrderOut {
  id: string;
  order_number: string;
  buyer_id: string;
  client_reference_id: string | null;
  supplier_id: string;
  supplier_name: string | null;
  status: OrderStatus;
  notes: string | null;
  supplier_edit_notes: string | null;
  buyer_response_notes: string | null;
  payment_reference: string | null;
  payment_reference_no: string | null;
  payment_amount: string | null;
  payment_date: string | null;
  payment_declined_remarks: string | null;
  cancel_remarks: string | null;
  total: string | null;
  items: OrderItemOut[];
  created_at: string;
  updated_at: string;
}

export interface PaginatedOrdersOut {
  items: OrderOut[];
  total: number;
  limit: number;
  offset: number;
}

interface ApiSuccess<T> {
  success: boolean;
  data: T;
}

// ── Raw API ───────────────────────────────────────────────────────────────────

export const orderApi = {
  // Buyer
  placeOrder(data: OrderCreate): Promise<OrderOut> {
    return axiosClient
      .post<ApiSuccess<OrderOut>>("/orders", data)
      .then((r) => r.data.data);
  },

  listMyOrders(params: {
    limit: number;
    offset: number;
    status?: string;
  }): Promise<PaginatedOrdersOut> {
    return axiosClient
      .get<ApiSuccess<PaginatedOrdersOut>>("/orders/me", { params })
      .then((r) => r.data.data);
  },

  getMyOrder(orderId: string): Promise<OrderOut> {
    return axiosClient
      .get<ApiSuccess<OrderOut>>(`/orders/me/${orderId}`)
      .then((r) => r.data.data);
  },

  cancelMyOrder(orderId: string): Promise<OrderOut> {
    return axiosClient
      .post<ApiSuccess<OrderOut>>(`/orders/me/${orderId}/cancel`)
      .then((r) => r.data.data);
  },

  respondToOrder(orderId: string, data: BuyerOrderRespond): Promise<OrderOut> {
    return axiosClient
      .patch<ApiSuccess<OrderOut>>(`/orders/me/${orderId}/respond`, data)
      .then((r) => r.data.data);
  },

  // Supplier
  listIncomingOrders(params: {
    limit: number;
    offset: number;
    status?: string;
  }): Promise<PaginatedOrdersOut> {
    return axiosClient
      .get<ApiSuccess<PaginatedOrdersOut>>("/suppliers/me/orders", { params })
      .then((r) => r.data.data);
  },

  getIncomingOrder(orderId: string): Promise<OrderOut> {
    return axiosClient
      .get<ApiSuccess<OrderOut>>(`/suppliers/me/orders/${orderId}`)
      .then((r) => r.data.data);
  },

  updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    cancelRemarks?: string,
  ): Promise<OrderOut> {
    return axiosClient
      .patch<ApiSuccess<OrderOut>>(`/suppliers/me/orders/${orderId}/status`, {
        status,
        ...(cancelRemarks ? { cancel_remarks: cancelRemarks } : {}),
      })
      .then((r) => r.data.data);
  },

  editOrder(orderId: string, data: OrderEdit): Promise<OrderOut> {
    return axiosClient
      .patch<ApiSuccess<OrderOut>>(`/suppliers/me/orders/${orderId}/edit`, data)
      .then((r) => r.data.data);
  },

  declinePayment(orderId: string, remarks: string): Promise<OrderOut> {
    return axiosClient
      .patch<
        ApiSuccess<OrderOut>
      >(`/suppliers/me/orders/${orderId}/decline-payment`, { remarks })
      .then((r) => r.data.data);
  },
};

// ── Query keys ────────────────────────────────────────────────────────────────

export const orderQueryKeys = {
  myOrders: (params: object) => ["myOrders", params] as const,
  myOrder: (id: string) => ["myOrder", id] as const,
  incomingOrders: (params: object) => ["incomingOrders", params] as const,
  incomingOrder: (id: string) => ["incomingOrder", id] as const,
};

// ── Buyer hooks ───────────────────────────────────────────────────────────────

export function usePlaceOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: orderApi.placeOrder,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myOrders"] });
      toast.success("Order placed successfully!");
    },
    onError: (err: unknown) => {
      toast.error(getAxiosErrorMessage(err, "Failed to place order."));
    },
  });
}

export function useMyOrders(params: {
  limit: number;
  offset: number;
  status?: string;
}) {
  return useQuery({
    queryKey: orderQueryKeys.myOrders(params),
    queryFn: () => orderApi.listMyOrders(params),
    staleTime: 15_000,
  });
}

export function useMyOrder(orderId: string | undefined) {
  return useQuery({
    queryKey: orderQueryKeys.myOrder(orderId ?? ""),
    queryFn: () => orderApi.getMyOrder(orderId!),
    enabled: !!orderId,
    staleTime: 15_000,
  });
}

export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: orderApi.cancelMyOrder,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myOrders"] });
      qc.invalidateQueries({ queryKey: ["myOrder"] });
      toast.success("Order cancelled.");
    },
    onError: (err: unknown) => {
      toast.error(getAxiosErrorMessage(err, "Failed to cancel order."));
    },
  });
}

export function useRespondToOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      data,
    }: {
      orderId: string;
      data: BuyerOrderRespond;
    }) => orderApi.respondToOrder(orderId, data),
    onSuccess: (_result, vars) => {
      qc.invalidateQueries({ queryKey: ["myOrders"] });
      qc.invalidateQueries({ queryKey: ["myOrder"] });
      if (vars.data.action === "confirm") {
        toast.success("Order confirmed! The supplier will now proceed.");
      } else {
        toast.success("Order cancelled.");
      }
    },
    onError: (err: unknown) => {
      toast.error(getAxiosErrorMessage(err, "Failed to respond to order."));
    },
  });
}

// ── Supplier hooks ────────────────────────────────────────────────────────────

export function useIncomingOrders(params: {
  limit: number;
  offset: number;
  status?: string;
}) {
  return useQuery({
    queryKey: orderQueryKeys.incomingOrders(params),
    queryFn: () => orderApi.listIncomingOrders(params),
    staleTime: 15_000,
  });
}

export function useIncomingOrder(orderId: string | undefined) {
  return useQuery({
    queryKey: orderQueryKeys.incomingOrder(orderId ?? ""),
    queryFn: () => orderApi.getIncomingOrder(orderId!),
    enabled: !!orderId,
    staleTime: 15_000,
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      status,
      cancelRemarks,
    }: {
      orderId: string;
      status: OrderStatus;
      cancelRemarks?: string;
    }) => orderApi.updateOrderStatus(orderId, status, cancelRemarks),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incomingOrders"] });
      qc.invalidateQueries({ queryKey: ["incomingOrder"] });
      toast.success("Order status updated.");
    },
    onError: (err: unknown) => {
      toast.error(getAxiosErrorMessage(err, "Failed to update status."));
    },
  });
}

export function useEditOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, data }: { orderId: string; data: OrderEdit }) =>
      orderApi.editOrder(orderId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incomingOrders"] });
      qc.invalidateQueries({ queryKey: ["incomingOrder"] });
      toast.success("Order updated. Buyer must confirm the changes.");
    },
    onError: (err) => {
      toast.error(getAxiosErrorMessage(err, "Failed to edit order."));
    },
  });
}

export function useDeclinePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, remarks }: { orderId: string; remarks: string }) =>
      orderApi.declinePayment(orderId, remarks),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incomingOrders"] });
      qc.invalidateQueries({ queryKey: ["incomingOrder"] });
      toast.success("Payment declined. Buyer must re-submit a valid receipt.");
    },
    onError: (err: unknown) => {
      toast.error(getAxiosErrorMessage(err, "Failed to decline payment."));
    },
  });
}
