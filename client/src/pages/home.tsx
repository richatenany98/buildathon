import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import RepositoryInput from "@/components/repository-input";
import { apiRequest } from "@/lib/queryClient";
import type { Repository, InsertRepository } from "@shared/schema";
import { Brain, History, HelpCircle } from "lucide-react";

export default function Home() {
  const [, setLocation] = useLocation();

  const createRepositoryMutation = useMutation({
    mutationFn: async (data: InsertRepository) => {
      const response = await apiRequest("POST", "/api/repositories", data);
      return response.json() as Promise<Repository>;
    },
    onSuccess: (repository) => {
      setLocation(`/analysis/${repository.id}`);
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Understand Your Code's Evolution
          </h2>
          <p className="text-lg text-github-gray max-w-2xl mx-auto">
            Analyze your repository's complete Git history to uncover semantic insights, 
            architectural decisions, and the "why" behind every change.
          </p>
        </div>

        <RepositoryInput
          onSubmit={(data) => createRepositoryMutation.mutate(data)}
          isLoading={createRepositoryMutation.isPending}
          error={createRepositoryMutation.error?.message}
        />

        <div className="mt-8 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-4">What You'll Discover</h3>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="text-center p-4" data-testid="feature-semantic">
              <div className="w-12 h-12 bg-github-blue bg-opacity-10 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Brain className="text-github-blue w-6 h-6" />
              </div>
              <h4 className="font-medium mb-2">Semantic Understanding</h4>
              <p className="text-sm text-github-gray">AI-powered analysis reveals the purpose behind code changes</p>
            </div>
            <div className="text-center p-4" data-testid="feature-timeline">
              <div className="w-12 h-12 bg-github-success bg-opacity-10 rounded-lg flex items-center justify-center mx-auto mb-3">
                <History className="text-github-success w-6 h-6" />
              </div>
              <h4 className="font-medium mb-2">Evolution History</h4>
              <p className="text-sm text-github-gray">Visualize how features and architecture evolved over time</p>
            </div>
            <div className="text-center p-4" data-testid="feature-qa">
              <div className="w-12 h-12 bg-github-warning bg-opacity-10 rounded-lg flex items-center justify-center mx-auto mb-3">
                <HelpCircle className="text-github-warning w-6 h-6" />
              </div>
              <h4 className="font-medium mb-2">Natural Language Q&A</h4>
              <p className="text-sm text-github-gray">Ask questions about your codebase evolution in plain English</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
