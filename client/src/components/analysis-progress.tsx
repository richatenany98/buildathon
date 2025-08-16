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
    <div className="min-h-screen bg-gradient-to-br from-blue-50/30 via-purple-50/20 to-indigo-50/30">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.1),transparent_50%)]" />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative">
        <Card className="glass-card backdrop-blur-xl border-white/20 shadow-2xl">
          <CardContent className="p-10">
            <div className="text-center mb-10">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg floating-animation">
                <Settings className="text-white w-10 h-10 animate-spin" />
              </div>
              <h2 className="text-3xl font-bold gradient-text mb-4">Analyzing Repository</h2>
              <p className="text-slate-600 text-lg mb-6 max-w-2xl mx-auto" data-testid="text-repository-url">
                {repository.url}
              </p>
              <div className="flex items-center justify-center space-x-6">
                <div className="text-center">
                  <div className="text-4xl font-bold gradient-text" data-testid="text-progress-percentage">
                    {Math.round(progress.progress)}%
                  </div>
                  <div className="text-sm text-slate-500 font-medium">Complete</div>
                </div>
              </div>
            </div>

            {/* Enhanced Progress Bar */}
            <div className="mb-10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-700">Overall Progress</span>
                <span className="text-sm font-medium text-slate-700">{Math.round(progress.progress)}%</span>
              </div>
              <div className="w-full bg-white/50 rounded-full h-3 shadow-inner backdrop-blur-sm">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500 shadow-sm"
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
            </div>

            {/* Enhanced Steps */}
            <div className="space-y-6">
              {steps.map((step, index) => {
                const status = getStepStatus(step.id);
              const Icon = step.icon;
              
                const stepColors = {
                  completed: "bg-green-500 text-white",
                  active: "bg-blue-500 text-white",
                  failed: "bg-red-500 text-white",
                  pending: "bg-gray-200 text-gray-500"
                };

                return (
                  <div key={step.id} className="relative group" data-testid={`progress-step-${step.id}`}>
                    <div className="flex items-start space-x-6 p-6 bg-white/50 backdrop-blur-sm rounded-xl border border-white/30 hover:bg-white/70 transition-all duration-300">
                      {/* Step Icon with Connection Line */}
                      <div className="flex flex-col items-center">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${stepColors[status]} transition-all duration-300 group-hover:scale-110`}>
                          {status === "active" ? (
                            <Settings className="w-6 h-6 animate-spin" />
                          ) : status === "failed" ? (
                            <AlertCircle className="w-6 h-6" />
                          ) : (
                            <step.icon className="w-6 h-6" />
                          )}
                        </div>
                        {index < steps.length - 1 && (
                          <div className={`w-1 h-12 mt-4 rounded-full transition-all duration-500 ${
                            status === "completed" ? "bg-green-300" : "bg-gray-200"
                          }`} />
                        )}
                      </div>

                      {/* Step Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-lg font-semibold text-slate-800">{step.title}</h4>
                          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                            status === "completed" ? "bg-green-100 text-green-700" :
                            status === "active" ? "bg-blue-100 text-blue-700" :
                            status === "failed" ? "bg-red-100 text-red-700" :
                            "bg-gray-100 text-gray-600"
                          }`}>
                            {status === "completed" ? "Completed" :
                             status === "active" ? "In Progress" :
                             status === "failed" ? "Failed" : "Pending"}
                          </div>
                        </div>
                        <p className="text-slate-600 leading-relaxed">{step.description}</p>
                        {status === "active" && step.id === "analyzing" && (
                          <div className="mt-4">
                            <div className="w-full bg-white/50 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${progress.progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
            })}
            </div>

            <div className="mt-10 pt-8 border-t border-white/20">
              <div className="text-center">
                <div className="flex items-center justify-center space-x-2 text-slate-600">
                  <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">
                    {progress.status === "completed" 
                      ? "Analysis completed successfully!" 
                      : progress.status === "failed"
                      ? "Analysis failed - please try again"
                      : "Estimated time remaining: 3-5 minutes"}
                  </span>
                </div>
                {repository.createdAt && (
                  <div className="mt-2 text-xs text-slate-500" data-testid="text-analysis-time">
                    Started {new Date(repository.createdAt).toLocaleTimeString()}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
