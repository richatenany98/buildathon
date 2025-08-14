import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import type { Document } from "@shared/mongodb-schema";

interface CreateDocumentForm {
  title: string;
  language: string;
  content: string;
}

export default function Dashboard() {
  const [location, setLocation] = useLocation();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateDocumentForm>({
    title: "",
    language: "javascript",
    content: "",
  });

  const { user, logout } = useAuth();
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const createDocumentMutation = useMutation({
    mutationFn: async (newDocument: CreateDocumentForm) => {
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDocument),
      });
      if (!response.ok) throw new Error("Failed to create document");
      return response.json();
    },
    onSuccess: (newDocument) => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setIsCreateModalOpen(false);
      setCreateForm({ title: "", language: "javascript", content: "" });
      setLocation(`/editor/${newDocument.id}`);
    },
  });

  const handleCreateDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (createForm.title.trim()) {
      createDocumentMutation.mutate(createForm);
    }
  };

  const openDocument = (documentId: string) => {
    setLocation(`/editor/${documentId}`);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getLanguageColor = (language: string) => {
    const colors: Record<string, string> = {
      javascript: "bg-yellow-500",
      typescript: "bg-blue-500",
      python: "bg-green-500",
      java: "bg-orange-500",
      cpp: "bg-blue-600",
      html: "bg-red-500",
      css: "bg-blue-400",
      json: "bg-gray-500",
      markdown: "bg-purple-500",
    };
    return colors[language] || "bg-gray-500";
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">CS</span>
            </div>
            <h1 className="text-xl font-semibold">CodeStream</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user?.username?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="hidden sm:block">
                <p className="text-white text-sm font-medium">{user?.username}</p>
                <p className="text-gray-400 text-xs">{user?.email}</p>
              </div>
            </div>
            
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <span>+</span>
              <span>New Document</span>
            </button>
            
            <button
              onClick={() => logout()}
              className="bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-lg text-sm transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">Your Documents</h2>
          <p className="text-gray-400">Create and collaborate on code documents in real-time</p>
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📄</span>
            </div>
            <h3 className="text-lg font-medium mb-2">No documents yet</h3>
            <p className="text-gray-400 mb-6">Create your first document to get started</p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg transition-colors"
            >
              Create Document
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map((doc) => (
              <div
                key={doc.id}
                onClick={() => openDocument(doc.id)}
                className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors cursor-pointer border border-gray-700 hover:border-gray-600"
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="font-medium truncate mr-2">{doc.title}</h3>
                  <div className={`w-3 h-3 rounded-full ${getLanguageColor(doc.language)}`} />
                </div>
                
                <div className="text-sm text-gray-400 mb-4">
                  <div className="flex items-center space-x-4">
                    <span>{doc.language}</span>
                    <span>•</span>
                    <span>{doc.activeUsers?.length || 0} active</span>
                    <span>•</span>
                    <span>{doc.ownerId === user?.id ? 'Owner' : `by ${doc.ownerUsername}`}</span>
                  </div>
                </div>

                <div className="text-xs text-gray-500">
                  <div>Created: {formatDate(doc.createdAt)}</div>
                  <div>Updated: {formatDate(doc.updatedAt)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Document Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Create New Document</h3>
            
            <form onSubmit={handleCreateDocument}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Document Name</label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  placeholder="my-awesome-script.js"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Language</label>
                <select
                  value={createForm.language}
                  onChange={(e) => setCreateForm({ ...createForm, language: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                >
                  <option value="javascript">JavaScript</option>
                  <option value="typescript">TypeScript</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="cpp">C++</option>
                  <option value="html">HTML</option>
                  <option value="css">CSS</option>
                  <option value="json">JSON</option>
                  <option value="markdown">Markdown</option>
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Initial Content (optional)</label>
                <textarea
                  value={createForm.content}
                  onChange={(e) => setCreateForm({ ...createForm, content: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 h-24 resize-none focus:outline-none focus:border-blue-500"
                  placeholder="Start with some initial code..."
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createDocumentMutation.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {createDocumentMutation.isPending ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}