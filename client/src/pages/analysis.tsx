import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import AnalysisProgress from "@/components/analysis-progress";
import AnalysisDashboard from "@/components/analysis-dashboard";
import type { Repository } from "@shared/schema";
import type { AnalysisProgress as AnalysisProgressType } from "@/lib/types";

export default function Analysis() {
  const { id } = useParams<{ id: string }>();

  const { data: repository, isLoading: repositoryLoading } = useQuery({
    queryKey: ["/api/repositories", id],
    queryFn: getQueryFn<Repository>({ on401: "throw" }),
    refetchInterval: (query) => {
      const repo = query.state.data;
      return repo && repo.analysisStatus !== "completed" && repo.analysisStatus !== "failed" ? 5000 : false;
    },
  });

  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ["/api/repositories", id, "progress"],
    queryFn: getQueryFn<AnalysisProgressType>({ on401: "throw" }),
    refetchInterval: (query) => {
      const progress = query.state.data;
      return progress && progress.status !== "completed" && progress.status !== "failed" ? 2000 : false;
    },
  });

  if (repositoryLoading || progressLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-github-blue"></div>
      </div>
    );
  }

  if (!repository || !progress) {
    return (
      <div className="text-center py-8">
        <p className="text-github-gray">Repository not found</p>
      </div>
    );
  }

  if (progress.status !== "completed") {
    return <AnalysisProgress repository={repository} progress={progress} />;
  }

  return <AnalysisDashboard repository={repository} />;
}
