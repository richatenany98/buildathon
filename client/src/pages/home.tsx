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
      // Use _id for MongoDB, id for fallback compatibility
      const repositoryId = repository._id || repository.id;
      setLocation(`/analysis/${repositoryId}`);
    },
  });

  return (
    <div className="min-h-screen">
      {/* Hero Section with Enhanced Gradients */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-purple-600/5 to-indigo-600/5" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.1),transparent_50%)]" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold gradient-text mb-6 leading-tight">
              Understand Your Code's Evolution
            </h1>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Analyze your repository's complete Git history to uncover semantic insights, 
              architectural decisions, and the "why" behind every change.
            </p>
          </div>

        <RepositoryInput
          onSubmit={(data) => createRepositoryMutation.mutate(data)}
          isLoading={createRepositoryMutation.isPending}
          error={createRepositoryMutation.error?.message}
        />

          <div className="mt-16 text-center">
            <h3 className="text-2xl font-semibold text-slate-800 mb-8">What You'll Discover</h3>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="glass-card text-center p-8 rounded-2xl hover:scale-105 transition-all duration-300 group" data-testid="feature-semantic">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:shadow-xl transition-shadow">
                  <Brain className="text-white w-8 h-8" />
                </div>
                <h4 className="text-lg font-semibold mb-3 text-slate-800">Semantic Understanding</h4>
                <p className="text-slate-600 leading-relaxed">AI-powered analysis reveals the purpose behind code changes</p>
              </div>
              <div className="glass-card text-center p-8 rounded-2xl hover:scale-105 transition-all duration-300 group" data-testid="feature-timeline">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:shadow-xl transition-shadow">
                  <History className="text-white w-8 h-8" />
                </div>
                <h4 className="text-lg font-semibold mb-3 text-slate-800">Evolution History</h4>
                <p className="text-slate-600 leading-relaxed">Visualize how features and architecture evolved over time</p>
              </div>
              <div className="glass-card text-center p-8 rounded-2xl hover:scale-105 transition-all duration-300 group" data-testid="feature-qa">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:shadow-xl transition-shadow">
                  <HelpCircle className="text-white w-8 h-8" />
                </div>
                <h4 className="text-lg font-semibold mb-3 text-slate-800">Natural Language Q&A</h4>
                <p className="text-slate-600 leading-relaxed">Ask questions about your codebase evolution in plain English</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
