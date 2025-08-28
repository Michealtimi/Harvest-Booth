export interface UploadApiResponse {
  success: boolean;
  jobId?: string;
  error?: string;
}

export interface StatusApiResponse {
  success: boolean;
  status?: "pending" | "processing" | "done" | "failed";
  outputUrl?: string;
  error?: string;
}
