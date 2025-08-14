import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { Document } from "@shared/mongodb-schema";

interface DocumentInfoProps {
  document: Document;
}

export default function DocumentInfo({ document }: DocumentInfoProps) {
  const { toast } = useToast();
  
  const getFileSize = (content: string) => {
    const bytes = new Blob([content]).size;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getLineCount = (content: string) => {
    return content.split('\n').length;
  };

  const handleShareDocument = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      toast({
        title: "Link copied!",
        description: "Document link has been copied to clipboard.",
      });
    }).catch(() => {
      toast({
        title: "Failed to copy link",
        description: "Please copy the URL manually.",
        variant: "destructive",
      });
    });
  };

  const handleDownloadDocument = () => {
    const blob = new Blob([document.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = document.title;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Download started",
      description: `${document.title} is being downloaded.`,
    });
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  return (
    <div className="p-4 border-b border-vscode-border">
      <h3 className="font-medium mb-3 flex items-center">
        <i className="fas fa-file-code mr-2"></i>
        Document Info
      </h3>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-vscode-text-dim">Created:</span>
          <span>{formatRelativeTime(new Date(document.createdAt))}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-vscode-text-dim">Lines:</span>
          <span>{getLineCount(document.content)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-vscode-text-dim">Size:</span>
          <span>{getFileSize(document.content)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-vscode-text-dim">Language:</span>
          <span>{document.language.charAt(0).toUpperCase() + document.language.slice(1)}</span>
        </div>
      </div>
      
      <div className="mt-4 space-y-2">
        <Button 
          onClick={handleShareDocument}
          className="w-full bg-vscode-accent hover:bg-blue-600 text-white"
          size="sm"
        >
          <i className="fas fa-share mr-2"></i>
          Share Document
        </Button>
        <Button 
          onClick={handleDownloadDocument}
          variant="secondary"
          className="w-full bg-vscode-border hover:bg-gray-600 text-vscode-text"
          size="sm"
        >
          <i className="fas fa-download mr-2"></i>
          Download
        </Button>
      </div>
    </div>
  );
}
