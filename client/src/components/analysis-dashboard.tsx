import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import QueryInterface from "@/components/query-interface";
import TimelineVisualization from "@/components/timeline-visualization";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { GitBranch, Download, RefreshCw } from "lucide-react";
import type { Repository, ChangeEvent, Query } from "@shared/schema";

interface AnalysisDashboardProps {
  repository: Repository;
}

export default function AnalysisDashboard({ repository }: AnalysisDashboardProps) {
  const { data: changeEvents = [] } = useQuery({
    queryKey: ["/api/repositories", repository.id, "events"],
    queryFn: getQueryFn<ChangeEvent[]>({ on401: "throw" }),
  });

  const { data: recentQueries = [] } = useQuery({
    queryKey: ["/api/repositories", repository.id, "queries"],
    queryFn: getQueryFn<Query[]>({ on401: "throw" }),
  });

  const getCategoryStats = () => {
    const stats = changeEvents.reduce((acc, event) => {
      acc[event.category] = (acc[event.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      { name: "New Features", count: stats.new_feature || 0, color: "bg-github-success" },
      { name: "Enhancements", count: stats.enhancement || 0, color: "bg-github-blue" },
      { name: "Bug Fixes", count: stats.bug_fix || 0, color: "bg-github-error" },
      { name: "Refactoring", count: stats.refactoring || 0, color: "bg-github-warning" },
    ];
  };

  const categoryStats = getCategoryStats();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Repository Overview Header */}
      <Card className="shadow-sm mb-8">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-github-blue bg-opacity-10 rounded-lg flex items-center justify-center">
                <GitBranch className="text-github-blue w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900" data-testid="text-repository-name">
                  {repository.name}
                </h2>
                {repository.description && (
                  <p className="text-github-gray" data-testid="text-repository-description">
                    {repository.description}
                  </p>
                )}
                <div className="flex items-center space-x-4 mt-2 text-sm text-github-gray">
                  <span data-testid="text-commit-count">{repository.commitCount} commits</span>
                  <span data-testid="text-contributor-count">{repository.contributorCount} contributors</span>
                  <span data-testid="text-analyzed-time">
                    Analyzed {repository.lastAnalyzedAt ? new Date(repository.lastAnalyzedAt).toLocaleDateString() : 'recently'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" data-testid="button-export-report">
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
              <Button size="sm" className="bg-github-blue hover:bg-blue-700" data-testid="button-reanalyze">
                <RefreshCw className="w-4 h-4 mr-2" />
                Re-analyze
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <QueryInterface repositoryId={repository.id} />
          <TimelineVisualization events={changeEvents} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Analysis Summary */}
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Analysis Summary</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-github-gray">Total Commits</span>
                  <span className="font-medium" data-testid="text-total-commits">{repository.commitCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-github-gray">Contributors</span>
                  <span className="font-medium" data-testid="text-total-contributors">{repository.contributorCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-github-gray">Files Analyzed</span>
                  <span className="font-medium" data-testid="text-files-analyzed">{repository.fileCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-github-gray">Change Events</span>
                  <span className="font-medium" data-testid="text-change-events">{repository.changeEventCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-github-gray">Major Features</span>
                  <span className="font-medium" data-testid="text-major-features">{repository.majorFeatureCount}</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="text-sm">
                  <div className="flex justify-between mb-2">
                    <span className="text-github-gray">Analysis Confidence</span>
                    <span className="font-medium text-github-success" data-testid="text-confidence-score">
                      {repository.confidenceScore}%
                    </span>
                  </div>
                  <Progress value={repository.confidenceScore} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Change Categories */}
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Change Categories</h3>
              
              <div className="space-y-3">
                {categoryStats.map((category) => (
                  <div key={category.name} className="flex items-center justify-between" data-testid={`category-${category.name.toLowerCase().replace(' ', '-')}`}>
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 ${category.color} rounded-full`} />
                      <span className="text-sm">{category.name}</span>
                    </div>
                    <span className="text-sm font-medium">{category.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Queries */}
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Queries</h3>
              
              <div className="space-y-3">
                {recentQueries.slice(-3).reverse().map((query) => (
                  <button
                    key={query.id}
                    className="w-full text-left p-3 rounded-lg hover:bg-gray-50 border border-gray-100 transition-colors"
                    data-testid={`query-${query.id}`}
                  >
                    <div className="text-sm font-medium text-gray-900 mb-1 truncate">
                      "{query.question}"
                    </div>
                    <div className="text-xs text-github-gray">
                      {new Date(query.createdAt).toLocaleTimeString()}
                    </div>
                  </button>
                ))}
                {recentQueries.length === 0 && (
                  <p className="text-sm text-github-gray text-center py-4">
                    No queries yet. Ask your first question!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
