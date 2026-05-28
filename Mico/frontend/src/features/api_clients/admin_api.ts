import { api } from "../../lib/api";
import type { SupplierResponse } from "./superadmin_api";

export type KycDocType =
  | "DTI_SEC"
  | "BIR_COR"
  | "FDA_LTO"
  | "MAYORS_PERMIT"
  | "VALID_ID"
  | "PROOF_OF_ADDRESS"
  | "OTHER";

export type KycDocStatus = "SUBMITTED" | "APPROVED" | "REJECTED";

export interface KycDocumentResponse {
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

export interface SupplierWithKycResponse {
  supplier: SupplierResponse;
  kyc_documents: KycDocumentResponse[];
  kyc_complete: boolean;
}

export interface PendingSupplierListResponse {
  items: SupplierResponse[];
  total: number;
  skip: number;
  limit: number;
}

export interface ApproveSupplierResponse {
  message: string;
  supplier_id: string;
  status: string;
  approved_at: string;
  approved_by: string;
}

export interface RejectSupplierRequest {
  reason: string;
}

export interface RejectSupplierResponse {
  message: string;
  supplier_id: string;
  status: string;
  rejected_at: string;
  rejected_by: string;
  rejection_reason: string;
}

export interface ReviewKycDocumentRequest {
  status: "APPROVED" | "REJECTED";
  remarks?: string;
}

export const adminApi = {
  listPending(
    params: { skip?: number; limit?: number; q?: string },
    token: string,
  ): Promise<PendingSupplierListResponse> {
    return api.get<PendingSupplierListResponse>("/admin/suppliers/pending", {
      params,
      token,
    });
  },

  getSupplierKyc(
    supplierId: string,
    token: string,
  ): Promise<SupplierWithKycResponse> {
    return api.get<SupplierWithKycResponse>(
      `/admin/suppliers/${supplierId}/kyc`,
      { token },
    );
  },

  approve(supplierId: string, token: string): Promise<ApproveSupplierResponse> {
    return api.post<ApproveSupplierResponse>(
      `/admin/suppliers/${supplierId}/approve`,
      {},
      { token },
    );
  },

  reject(
    supplierId: string,
    body: RejectSupplierRequest,
    token: string,
  ): Promise<RejectSupplierResponse> {
    return api.post<RejectSupplierResponse>(
      `/admin/suppliers/${supplierId}/reject`,
      body,
      { token },
    );
  },

  reviewKycDocument(
    documentId: string,
    body: ReviewKycDocumentRequest,
    token: string,
  ): Promise<KycDocumentResponse> {
    return api.post<KycDocumentResponse>(
      `/admin/kyc/documents/${documentId}/review`,
      body,
      { token },
    );
  },
};
