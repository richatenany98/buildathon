import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertRepositorySchema, type InsertRepository } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { GitBranch, Search, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RepositoryInputProps {
  onSubmit: (data: InsertRepository) => void;
  isLoading?: boolean;
  error?: string;
}

const formSchema = insertRepositorySchema.extend({
  cloneProtocol: insertRepositorySchema.shape.cloneProtocol.default("https"),
  defaultRef: insertRepositorySchema.shape.defaultRef.default("refs/heads/main"),
});

export default function RepositoryInput({ onSubmit, isLoading, error }: RepositoryInputProps) {
  const form = useForm<InsertRepository>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url: "",
      name: "",
      description: "",
      defaultRef: "refs/heads/main",
      cloneProtocol: "https",
    },
  });

  const handleSubmit = (data: InsertRepository) => {
    // Extract repository name from URL if not provided
    if (!data.name && data.url) {
      const match = data.url.match(/\/([^\/]+?)(?:\.git)?$/);
      if (match) {
        data.name = match[1];
      }
    }
    onSubmit(data);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="glass-card backdrop-blur-xl border-white/20 shadow-2xl">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg floating-animation">
              <Search className="text-white w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold gradient-text mb-2">Begin Analysis</h2>
            <p className="text-slate-600">Enter your repository URL to start exploring its evolution</p>
          </div>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div>
              <Label htmlFor="url" className="text-sm font-medium text-slate-700 mb-3 block flex items-center">
                <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mr-2"></div>
                Repository URL
              </Label>
              <div className="relative">
                <Input
                  id="url"
                  type="url"
                  placeholder="https://github.com/username/repository.git"
                  className="pl-12 pr-4 py-3 text-lg border-white/30 bg-white/50 backdrop-blur-sm rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all duration-300 hover:bg-white/70"
                  data-testid="input-repository-url"
                  {...form.register("url")}
                />
                <GitBranch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
              </div>
              {form.formState.errors.url && (
                <p className="text-sm text-red-500 mt-2 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  {form.formState.errors.url.message}
                </p>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name" className="text-sm font-medium text-slate-700 mb-3 block flex items-center">
                  <div className="w-2 h-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full mr-2"></div>
                  Repository Name (Optional)
                </Label>
                <Input
                  id="name"
                  placeholder="Auto-extracted from URL"
                  className="border-white/30 bg-white/50 backdrop-blur-sm rounded-xl focus:ring-2 focus:ring-green-500/30 focus:border-green-500/50 transition-all duration-300 hover:bg-white/70"
                  data-testid="input-repository-name"
                  {...form.register("name")}
                />
              </div>

              <div>
                <Label htmlFor="description" className="text-sm font-medium text-slate-700 mb-3 block flex items-center">
                  <div className="w-2 h-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-full mr-2"></div>
                  Description (Optional)
                </Label>
                <Input
                  id="description"
                  placeholder="Brief description"
                  className="border-white/30 bg-white/50 backdrop-blur-sm rounded-xl focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/50 transition-all duration-300 hover:bg-white/70"
                  data-testid="input-repository-description"
                  {...form.register("description")}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="branch" className="text-sm font-medium text-slate-700 mb-3 block flex items-center">
                  <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full mr-2"></div>
                  Branch (Optional)
                </Label>
                <Input
                  id="branch"
                  placeholder="main"
                  className="border-white/30 bg-white/50 backdrop-blur-sm rounded-xl focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/50 transition-all duration-300 hover:bg-white/70"
                  data-testid="input-branch"
                  value={form.watch("defaultRef")?.replace("refs/heads/", "") || ""}
                  onChange={(e) => form.setValue("defaultRef", `refs/heads/${e.target.value || "main"}`)}
                />
              </div>
              <div>
                <Label htmlFor="protocol" className="text-sm font-medium text-slate-700 mb-3 block flex items-center">
                  <div className="w-2 h-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full mr-2"></div>
                  Protocol
                </Label>
                <Select
                  value={form.watch("cloneProtocol")}
                  onValueChange={(value) => form.setValue("cloneProtocol", value as "https" | "ssh")}
                >
                  <SelectTrigger className="border-white/30 bg-white/50 backdrop-blur-sm rounded-xl focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all duration-300 hover:bg-white/70" data-testid="select-protocol">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white/95 backdrop-blur-sm border-white/30 rounded-xl">
                    <SelectItem value="https">HTTPS</SelectItem>
                    <SelectItem value="ssh">SSH</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {error && (
              <Alert className="border-red-200/50 bg-red-50/50 backdrop-blur-sm rounded-xl">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <AlertDescription className="text-red-700 font-medium">{error}</AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              disabled={isLoading} 
              className="w-full py-4 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-300 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:hover:scale-100"
              data-testid="button-start-analysis"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3"></div>
                  Starting Analysis...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <Search className="w-5 h-5 mr-3" />
                  Start Analysis
                </div>
              )}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <div className="flex items-center justify-center space-x-2 text-sm text-slate-500">
              <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full animate-pulse"></div>
              <p>Analysis typically takes 2-10 minutes depending on repository size</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
