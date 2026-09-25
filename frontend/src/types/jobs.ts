export interface Job {
  id: string;
  projectId: string;
  type: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  message: string;
  error?: string;
  result?: any;
}
