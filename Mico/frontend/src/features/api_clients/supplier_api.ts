/**
 * Typed API client for supplier-facing endpoints.
 * Uses the axios instance and TanStack Query hooks.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosClient, getAxiosErrorMessage } from "../../lib/axios_client";
import { toast } from "../../lib/toast";
import type { KycDocType, KycDocStatus } from "./admin_api";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SupplierStatus =
  | "DRAFT"
  | "PENDING_KYC"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED";

export interface MySupplierResponse {
  id: string;
  supplier_code: string;
  legal_name: string;
  trade_name: string | null;
  email: string;
  mobile_number: string | null;
  address_line1: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  country: string;
  status: SupplierStatus;
  is_email_verified: boolean;
  is_mobile_verified: boolean;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface MyKycDocumentResponse {
  id: string;
  supplier_id: string;
  doc_type: KycDocType;
  file_url: string;
  original_filename: string;
  status: KycDocStatus;
  remarks: string | null;
  uploaded_at: string;
  reviewed_at: string | null;
}

export interface MyKycDocumentsListResponse {
  items: MyKycDocumentResponse[];
  total: number;
}

// ── Query keys ────────────────────────────────────────────────────────────────

export const supplierQueryKeys = {
  profile: ["supplierProfile"] as const,
  kycDocs: ["supplierKycDocs"] as const,
};

// ── Raw API calls ─────────────────────────────────────────────────────────────

export const supplierApi = {
  getMyProfile(): Promise<MySupplierResponse> {
    return axiosClient
      .get<MySupplierResponse>("/suppliers/me")
      .then((r) => r.data);
  },
  getMyKycDocs(): Promise<MyKycDocumentsListResponse> {
    return axiosClient
      .get<MyKycDocumentsListResponse>("/suppliers/me/kyc/documents")
      .then((r) => r.data);
  },
  uploadKycDoc(
    docType: KycDocType,
    file: File,
  ): Promise<MyKycDocumentResponse> {
    const fd = new FormData();
    fd.append("doc_type", docType);
    fd.append("file", file);
    return axiosClient
      .post<MyKycDocumentResponse>("/suppliers/me/kyc/documents", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },
  deleteKycDoc(docId: string): Promise<void> {
    return axiosClient
      .delete(`/suppliers/me/kyc/documents/${docId}`)
      .then(() => undefined);
  },
};

// ── React Query hooks ─────────────────────────────────────────────────────────

export function useMySupplierProfile() {
  return useQuery({
    queryKey: supplierQueryKeys.profile,
    queryFn: supplierApi.getMyProfile,
    staleTime: 30_000,
  });
}

export function useMyKycDocs() {
  return useQuery({
    queryKey: supplierQueryKeys.kycDocs,
    queryFn: supplierApi.getMyKycDocs,
    staleTime: 10_000,
  });
}

export function useUploadKycDoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ docType, file }: { docType: KycDocType; file: File }) =>
      supplierApi.uploadKycDoc(docType, file),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: supplierQueryKeys.kycDocs });
      void qc.invalidateQueries({ queryKey: supplierQueryKeys.profile });
      toast.success("Document uploaded successfully.");
    },
    onError: (err) => {
      toast.error(getAxiosErrorMessage(err, "Upload failed."));
    },
  });
}

export function useDeleteKycDoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (docId: string) => supplierApi.deleteKycDoc(docId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: supplierQueryKeys.kycDocs });
      toast.success("Document deleted.");
    },
    onError: (err) => {
      toast.error(getAxiosErrorMessage(err, "Delete failed."));
    },
  });
}
