/**
 * API client for catalog import (CSV upload) endpoints.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosClient } from "../../lib/axios_client";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CatalogImportRecord {
  id: string;
  original_filename: string;
  /** "submitted" | "failed" */
  status: string;
  pharmalake_status_code: number | null;
  pharmalake_response: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
}

export interface CatalogImportsListResponse {
  items: CatalogImportRecord[];
  total: number;
  limit: number;
  offset: number;
}

// ── Raw API ───────────────────────────────────────────────────────────────────

export const importApi = {
  uploadCsv(
    file: File,
    clientReferenceNumber?: string,
  ): Promise<CatalogImportRecord> {
    const form = new FormData();
    form.append("file", file);
    if (clientReferenceNumber) {
      form.append("client_reference_number", clientReferenceNumber);
    }
    return axiosClient
      .post<{
        success: boolean;
        data: CatalogImportRecord;
      }>("/suppliers/me/catalog/import", form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data.data);
  },

  listImports(limit = 20, offset = 0): Promise<CatalogImportsListResponse> {
    return axiosClient
      .get<{
        success: boolean;
        data: CatalogImportsListResponse;
      }>("/suppliers/me/catalog/imports", { params: { limit, offset } })
      .then((r) => r.data.data);
  },
};

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useCatalogImports(limit = 20, offset = 0) {
  return useQuery({
    queryKey: ["catalogImports", limit, offset] as const,
    queryFn: () => importApi.listImports(limit, offset),
    staleTime: 30_000,
  });
}

export function useUploadCatalogImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => importApi.uploadCsv(file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalogImports"] });
    },
  });
}

// ── PharmaLake pipeline types ─────────────────────────────────────────────────

export type PlImportJobStatus =
  | "UPLOADED"
  | "EXTRACTING"
  | "EXTRACTED"
  | "AI_PROCESSING"
  | "AI_PROCESSED"
  | "SUBMITTING"
  | "SUBMITTED"
  | "FAILED";

export type PlDraftStatus =
  | "READY"
  | "NEEDS_REVIEW"
  | "BLOCKED"
  | "APPROVED"
  | "IGNORED"
  | "SUBMITTED";

export interface PlImportJob {
  import_id: string;
  filename: string;
  content_type: string;
  status: PlImportJobStatus;
  ai_status: string;
  total_sources: number;
  total_drafts: number;
  ready_count: number;
  needs_review_count: number;
  blocked_count: number;
  created_at: string;
  updated_at: string;
}

export interface PlImportDraft {
  draft_id: string;
  import_id: string;
  status: PlDraftStatus;
  brand_name: string | null;
  generic_name: string | null;
  dosage_form: string | null;
  strength: string | null;
  pack_size: string | null;
  barcode: string | null;
}

export interface PlImportDraftListResponse {
  items: PlImportDraft[];
  total: number;
  limit: number;
  skip: number;
}

// ── Pipeline API ──────────────────────────────────────────────────────────────

export const importPipelineApi = {
  getJob(plImportId: string): Promise<PlImportJob> {
    return axiosClient
      .get<{
        success: boolean;
        data: PlImportJob;
      }>(`/suppliers/me/catalog/imports/${plImportId}/pl-job`)
      .then((r) => r.data.data);
  },

  getDrafts(
    plImportId: string,
    limit = 20,
    skip = 0,
    status?: string,
  ): Promise<PlImportDraftListResponse> {
    return axiosClient
      .get<{
        success: boolean;
        data: PlImportDraftListResponse;
      }>(`/suppliers/me/catalog/imports/${plImportId}/pl-drafts`, { params: { limit, skip, ...(status ? { status } : {}) } })
      .then((r) => r.data.data);
  },

  triggerExtract(plImportId: string): Promise<PlImportJob> {
    return axiosClient
      .post<{
        success: boolean;
        data: PlImportJob;
      }>(`/suppliers/me/catalog/imports/${plImportId}/extract`)
      .then((r) => r.data.data);
  },

  triggerAiExtract(plImportId: string): Promise<PlImportJob> {
    return axiosClient
      .post<{
        success: boolean;
        data: PlImportJob;
      }>(`/suppliers/me/catalog/imports/${plImportId}/ai-extract`)
      .then((r) => r.data.data);
  },

  submitAll(plImportId: string): Promise<unknown> {
    return axiosClient
      .post<{
        success: boolean;
        data: unknown;
      }>(`/suppliers/me/catalog/imports/${plImportId}/submit-all`)
      .then((r) => r.data.data);
  },
};

// ── Pipeline hooks ────────────────────────────────────────────────────────────

export function usePlImportJob(plImportId: string | null) {
  return useQuery({
    queryKey: ["plImportJob", plImportId] as const,
    queryFn: () => importPipelineApi.getJob(plImportId!),
    enabled: !!plImportId,
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      const ai = query.state.data?.ai_status;
      const inFlight =
        s === "EXTRACTING" ||
        s === "AI_PROCESSING" ||
        s === "SUBMITTING" ||
        ai === "QUEUED" ||
        ai === "RUNNING";
      return inFlight ? 3000 : false;
    },
    staleTime: 10_000,
  });
}

export function usePlImportDrafts(
  plImportId: string | null,
  limit = 20,
  skip = 0,
) {
  return useQuery({
    queryKey: ["plImportDrafts", plImportId, limit, skip] as const,
    queryFn: () => importPipelineApi.getDrafts(plImportId!, limit, skip),
    enabled: !!plImportId,
    staleTime: 30_000,
  });
}

export function useTriggerExtract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (plImportId: string) =>
      importPipelineApi.triggerExtract(plImportId),
    onSuccess: (_, plImportId) => {
      qc.invalidateQueries({ queryKey: ["plImportJob", plImportId] });
    },
  });
}

export function useTriggerAiExtract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (plImportId: string) =>
      importPipelineApi.triggerAiExtract(plImportId),
    onSuccess: (_, plImportId) => {
      qc.invalidateQueries({ queryKey: ["plImportJob", plImportId] });
    },
  });
}

export function useSubmitAllDrafts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (plImportId: string) => importPipelineApi.submitAll(plImportId),
    onSuccess: (_, plImportId) => {
      qc.invalidateQueries({ queryKey: ["plImportJob", plImportId] });
      qc.invalidateQueries({ queryKey: ["plImportDrafts", plImportId] });
    },
  });
}
