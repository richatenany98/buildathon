import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import CodeEditor from "@/components/CodeEditor";
import UserList from "@/components/UserList";
import ConnectionStatus from "@/components/ConnectionStatus";
import DocumentInfo from "@/components/DocumentInfo";
import VersionHistory from "@/components/VersionHistory";
import ShareDialog from "@/components/ShareDialog";
import { useSocket } from "@/hooks/useSocket";
import { useCollaborativeEditor } from "@/hooks/useCollaborativeEditor";
import { useAuth } from "@/hooks/useAuth";
import type { Document } from "@shared/mongodb-schema";

export default function Editor() {
  const { id: documentId } = useParams();
  const [location, setLocation] = useLocation();
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();
  
  // Redirect to dashboard if no document ID
  if (!documentId) {
    setLocation("/");
    return null;
  }

  const { data: document, isLoading, error } = useQuery<Document>({
    queryKey: ["/api/documents", documentId],
    queryFn: async () => {
      const response = await fetch(`/api/documents/${documentId}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch document: ${response.status} ${response.statusText}`);
      }
      
      return response.json();
    },
  });

  const { socket, isConnected, users } = useSocket();
  const { 
    content, 
    onContentChange, 
    onCursorPositionChange, 
    onSelectionChange,
    cursors,
    selections 
  } = useCollaborativeEditor(socket, documentId);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-vscode-bg text-vscode-text">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-vscode-accent mx-auto mb-4"></div>
          <p>Loading editor...</p>
        </div>
      </div>
    );
  }

  if (error || (!isLoading && !document)) {
    return (
      <div className="h-screen flex items-center justify-center bg-vscode-bg text-vscode-text">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Document not found</h1>
          <p className="text-vscode-text-dim">The requested document could not be loaded.</p>
          {error && (
            <p className="text-red-400 text-sm mt-2">Error: {error.message}</p>
          )}
          {!isAuthenticated && (
            <div className="mt-6">
              <p className="text-gray-400 mb-4">You might need to log in to access this document.</p>
              <button
                onClick={() => setLocation("/auth")}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white transition-colors"
              >
                Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-vscode-bg text-vscode-text font-ui overflow-hidden">
      {/* Header Bar */}
      <header className="bg-vscode-sidebar border-b border-vscode-border px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {isAuthenticated ? (
            <button
              onClick={() => setLocation("/")}
              className="flex items-center space-x-2 text-vscode-text hover:text-vscode-accent transition-colors"
            >
              <span>←</span>
              <span>Dashboard</span>
            </button>
          ) : (
            <button
              onClick={() => setLocation("/auth")}
              className="flex items-center space-x-2 text-vscode-text hover:text-vscode-accent transition-colors"
            >
              <span>Sign In</span>
            </button>
          )}
          <div className="flex items-center space-x-2">
            <i className="fas fa-code text-vscode-accent"></i>
            <span className="font-semibold">CodeSync</span>
          </div>
          <div className="text-sm text-vscode-text-dim">
            <span>{document.title}</span>
            <span className="mx-2">•</span>
            <span>{isAuthenticated ? 'Auto-saved' : 'Read-only'}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {isAuthenticated && (
            <button
              onClick={() => setIsShareDialogOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm transition-colors"
            >
              Share
            </button>
          )}
          <ConnectionStatus isConnected={isConnected} />
          <div className="text-sm text-vscode-text-dim">
            <span>{users.length}</span> users online
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Code Editor Container */}
        <div className="flex-1 relative bg-vscode-bg">
          <CodeEditor
            content={content || document.content}
            language={document.language}
            onChange={isAuthenticated ? onContentChange : () => {}}
            onCursorPositionChange={isAuthenticated ? onCursorPositionChange : () => {}}
            onSelectionChange={isAuthenticated ? onSelectionChange : () => {}}
            cursors={isAuthenticated ? cursors : []}
            selections={isAuthenticated ? selections : []}
          />
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-vscode-sidebar border-l border-vscode-border flex flex-col">
          <UserList users={users} />
          {isAuthenticated && <DocumentInfo document={document} />}
          {isAuthenticated && <VersionHistory documentId={documentId} />}
          {!isAuthenticated && (
            <div className="p-4 border-b border-vscode-border">
              <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3">
                <p className="text-blue-300 text-sm">
                  <strong>View Only:</strong> Sign in to edit this document and see full features.
                </p>
                <button
                  onClick={() => setLocation("/auth")}
                  className="mt-2 bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm transition-colors text-white"
                >
                  Sign In
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Share Dialog */}
      <ShareDialog
        document={document}
        isOpen={isShareDialogOpen}
        onClose={() => setIsShareDialogOpen(false)}
      />
    </div>
  );
}
