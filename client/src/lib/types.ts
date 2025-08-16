export interface AnalysisProgress {
  status: 'queued' | 'cloning' | 'analyzing' | 'completed' | 'failed';
  commitCount: number;
  changeEventCount: number;
  progress: number;
}

export interface QueryResult {
  id: string;
  question: string;
  answer: string;
  relatedCommits: string[];
  relatedEvents: string[];
  createdAt: string;
  confidence?: number;
}
