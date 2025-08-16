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
      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="url" className="text-sm font-medium text-gray-700 mb-2 block">
                Repository URL
              </Label>
              <div className="relative">
                <Input
                  id="url"
                  type="url"
                  placeholder="https://github.com/username/repository.git"
                  className="pl-10"
                  data-testid="input-repository-url"
                  {...form.register("url")}
                />
                <GitBranch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-github-gray w-4 h-4" />
              </div>
              {form.formState.errors.url && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.url.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="name" className="text-sm font-medium text-gray-700 mb-2 block">
                Repository Name (Optional)
              </Label>
              <Input
                id="name"
                placeholder="Will be extracted from URL if not provided"
                data-testid="input-repository-name"
                {...form.register("name")}
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-sm font-medium text-gray-700 mb-2 block">
                Description (Optional)
              </Label>
              <Input
                id="description"
                placeholder="Brief description of the repository"
                data-testid="input-repository-description"
                {...form.register("description")}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="branch" className="text-sm font-medium text-gray-700 mb-2 block">
                  Branch (Optional)
                </Label>
                <Input
                  id="branch"
                  placeholder="main"
                  data-testid="input-branch"
                  value={form.watch("defaultRef")?.replace("refs/heads/", "") || ""}
                  onChange={(e) => form.setValue("defaultRef", `refs/heads/${e.target.value || "main"}`)}
                />
              </div>
              <div>
                <Label htmlFor="protocol" className="text-sm font-medium text-gray-700 mb-2 block">
                  Protocol
                </Label>
                <Select
                  value={form.watch("cloneProtocol")}
                  onValueChange={(value) => form.setValue("cloneProtocol", value as "https" | "ssh")}
                >
                  <SelectTrigger data-testid="select-protocol">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="https">HTTPS</SelectItem>
                    <SelectItem value="ssh">SSH</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full bg-github-blue hover:bg-blue-700"
              disabled={isLoading}
              data-testid="button-start-analysis"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Starting Analysis...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Start Analysis
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-github-gray">
              Analysis typically takes 2-10 minutes depending on repository size
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
