import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, Search, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { QueryResult } from "@/lib/types";
import type { Query } from "@shared/schema";

interface QueryInterfaceProps {
  repositoryId: string;
}

const suggestedQueries = [
  '"Why was Redux introduced?"',
  '"Show major architecture changes"',
  '"How did testing evolve?"',
  '"What authentication patterns were added?"',
];

export default function QueryInterface({ repositoryId }: QueryInterfaceProps) {
  const [question, setQuestion] = useState("");
  const [currentResult, setCurrentResult] = useState<QueryResult | null>(null);
  const queryClient = useQueryClient();

  const submitQueryMutation = useMutation({
    mutationFn: async (question: string) => {
      const response = await apiRequest("POST", `/api/repositories/${repositoryId}/query`, {
        question,
      });
      return response.json() as Promise<Query & { confidence?: number }>;
    },
    onSuccess: (data) => {
      setCurrentResult({
        id: data._id,
        question: data.question,
        answer: data.answer,
        relatedCommits: data.relatedCommits,
        relatedEvents: data.relatedEvents,
        createdAt: data.createdAt.toString(),
        confidence: data.confidence,
      });
      setQuestion("");
      // Invalidate queries to refresh recent queries
      queryClient.invalidateQueries({ queryKey: ["/api/repositories", repositoryId, "queries"] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim()) {
      submitQueryMutation.mutate(question.trim());
    }
  };

  const handleSuggestedQuery = (suggested: string) => {
    setQuestion(suggested.replace(/"/g, ''));
  };

  return (
    <div className="space-y-6">
      {/* Query Input */}
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Ask About Your Code Evolution</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask anything... e.g., 'Why was authentication added?' or 'How did the component architecture evolve?'"
                rows={3}
                className="resize-none pr-16"
                data-testid="textarea-query-input"
              />
              <Button
                type="submit"
                size="sm"
                className="absolute bottom-3 right-3 bg-github-blue hover:bg-blue-700"
                disabled={!question.trim() || submitQueryMutation.isPending}
                data-testid="button-submit-query"
              >
                {submitQueryMutation.isPending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-github-gray">Try asking:</span>
              {suggestedQueries.map((suggested) => (
                <button
                  key={suggested}
                  type="button"
                  className="text-sm bg-github-bg text-github-blue px-3 py-1 rounded-full hover:bg-blue-50 transition-colors"
                  onClick={() => handleSuggestedQuery(suggested)}
                  data-testid={`button-suggested-${suggested.replace(/[^a-zA-Z0-9]/g, '-')}`}
                >
                  {suggested}
                </button>
              ))}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Query Results */}
      {submitQueryMutation.error && (
        <Alert variant="destructive">
          <AlertDescription>
            {submitQueryMutation.error.message}
          </AlertDescription>
        </Alert>
      )}

      {currentResult && (
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Search className="text-github-blue w-5 h-5" />
              <h4 className="font-medium text-gray-900" data-testid="text-current-question">
                "{currentResult.question}"
              </h4>
              {currentResult.confidence && (
                <Badge variant="outline" className="ml-auto">
                  {Math.round(currentResult.confidence * 100)}% confidence
                </Badge>
              )}
            </div>

            <div className="prose max-w-none">
              <Alert className="border-github-blue bg-blue-50">
                <Info className="w-4 h-4" />
                <AlertDescription>
                  <div className="font-medium text-gray-900 mb-2">AI Analysis Result</div>
                  <div 
                    className="text-github-gray text-sm whitespace-pre-wrap"
                    data-testid="text-query-answer"
                    dangerouslySetInnerHTML={{ __html: currentResult.answer.replace(/\n/g, '<br>') }}
                  />
                </AlertDescription>
              </Alert>

              {currentResult.relatedCommits.length > 0 && (
                <div className="mt-6">
                  <h5 className="font-medium text-gray-900 mb-3">Related Commits</h5>
                  <div className="space-y-2">
                    {currentResult.relatedCommits.slice(0, 3).map((commitSha) => (
                      <div
                        key={commitSha}
                        className="bg-gray-50 rounded p-3 font-mono text-sm"
                        data-testid={`commit-${commitSha}`}
                      >
                        <span className="font-medium">{commitSha}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="text-xs text-github-gray">
                  <Info className="w-4 h-4 inline mr-1" />
                  Analysis based on repository history and commit patterns
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
