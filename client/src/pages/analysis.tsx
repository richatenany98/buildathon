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
      <div className="min-h-screen bg-gradient-to-br from-blue-50/30 via-purple-50/20 to-indigo-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg floating-animation">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          </div>
          <p className="text-slate-600 font-medium">Loading repository analysis...</p>
        </div>
      </div>
    );
  }

  if (!repository || !progress) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50/30 via-purple-50/20 to-indigo-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-2xl">❗</span>
          </div>
          <p className="text-slate-600 font-medium">Repository not found</p>
        </div>
      </div>
    );
  }

  if (progress.status !== "completed") {
    return <AnalysisProgress repository={repository} progress={progress} />;
  }

  return <AnalysisDashboard repository={repository} />;
}
