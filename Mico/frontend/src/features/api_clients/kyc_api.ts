import { api } from "../../lib/api";
import type { KycDocumentResponse, KycDocType } from "./admin_api";

export interface KycDocumentsListResponse {
  items: KycDocumentResponse[];
  total: number;
}

export const kycApi = {
  upload(
    docType: KycDocType,
    file: File,
    token: string,
  ): Promise<KycDocumentResponse> {
    const form = new FormData();
    form.append("doc_type", docType);
    form.append("file", file);
    return api.postForm<KycDocumentResponse>(
      "/suppliers/me/kyc/documents",
      form,
      { token },
    );
  },

  list(token: string): Promise<KycDocumentsListResponse> {
    return api.get<KycDocumentsListResponse>("/suppliers/me/kyc/documents", {
      token,
    });
  },

  delete(docId: string, token: string): Promise<void> {
    return api.delete<void>(`/suppliers/me/kyc/documents/${docId}`, { token });
  },
};
