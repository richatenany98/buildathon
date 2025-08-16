import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Clock, Settings, AlertCircle } from "lucide-react";
import type { Repository } from "@shared/schema";
import type { AnalysisProgress } from "@/lib/types";

interface AnalysisProgressProps {
  repository: Repository;
  progress: AnalysisProgress;
}

export default function AnalysisProgress({ repository, progress }: AnalysisProgressProps) {
  const getStepStatus = (step: string) => {
    switch (progress.status) {
      case "completed":
        return "completed";
      case "failed":
        return step === "cloning" ? "failed" : "pending";
      case "cloning":
        return step === "cloning" ? "active" : step === "extracting" || step === "analyzing" || step === "indexing" ? "pending" : "completed";
      case "analyzing":
        return step === "analyzing" ? "active" : step === "indexing" ? "pending" : "completed";
      default:
        return "pending";
    }
  };

  const steps = [
    {
      id: "cloning",
      title: "Repository Cloning",
      description: `Cloned repository with ${progress.commitCount} commits`,
      icon: CheckCircle,
    },
    {
      id: "extracting",
      title: "Change Extraction",
      description: "Extracted diffs and metadata from all commits",
      icon: CheckCircle,
    },
    {
      id: "analyzing",
      title: "AI Semantic Analysis",
      description: `Categorizing changes and extracting rationale... (${progress.changeEventCount} events identified)`,
      icon: Settings,
    },
    {
      id: "indexing",
      title: "Building Temporal Index",
      description: "Creating searchable embeddings for Q&A",
      icon: Clock,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Analyzing Repository</h3>
              <p className="text-github-gray" data-testid="text-repository-url">{repository.url}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-github-blue" data-testid="text-progress-percentage">
                {Math.round(progress.progress)}%
              </div>
              <div className="text-sm text-github-gray">Complete</div>
            </div>
          </div>

          <div className="space-y-4">
            {steps.map((step) => {
              const status = getStepStatus(step.id);
              const Icon = step.icon;
              
              return (
                <div key={step.id} className="flex items-center space-x-4" data-testid={`progress-step-${step.id}`}>
                  <div className="flex-shrink-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      status === "completed" 
                        ? "bg-github-success text-white" 
                        : status === "active" 
                        ? "bg-github-blue text-white animate-pulse" 
                        : status === "failed"
                        ? "bg-github-error text-white"
                        : "bg-gray-200 text-github-gray"
                    }`}>
                      {status === "active" ? (
                        <Settings className="w-4 h-4 animate-spin" />
                      ) : status === "failed" ? (
                        <AlertCircle className="w-4 h-4" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-900">{step.title}</span>
                      <Badge variant={
                        status === "completed" ? "default" : 
                        status === "active" ? "secondary" : 
                        status === "failed" ? "destructive" : "outline"
                      }>
                        {status === "completed" ? "Completed" : 
                         status === "active" ? "In Progress" : 
                         status === "failed" ? "Failed" : "Pending"}
                      </Badge>
                    </div>
                    <div className="text-xs text-github-gray">{step.description}</div>
                    {status === "active" && step.id === "analyzing" && (
                      <div className="mt-2">
                        <Progress value={progress.progress} className="h-2" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex justify-between text-sm text-github-gray">
              <span>
                {progress.status === "completed" 
                  ? "Analysis completed successfully" 
                  : progress.status === "failed"
                  ? "Analysis failed"
                  : "Estimated time remaining: 3-5 minutes"}
              </span>
              <span data-testid="text-analysis-time">
                {repository.createdAt && `Started ${new Date(repository.createdAt).toLocaleTimeString()}`}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
