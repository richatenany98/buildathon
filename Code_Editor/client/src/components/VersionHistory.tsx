import { useQuery } from "@tanstack/react-query";
import type { DocumentVersion } from "@shared/mongodb-schema";

interface VersionHistoryProps {
  documentId: string;
}

export default function VersionHistory({ documentId }: VersionHistoryProps) {
  const { data: versions = [] } = useQuery<DocumentVersion[]>({
    queryKey: ["/api/documents", documentId, "versions"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const getChangeStats = (operations: any[]) => {
    let additions = 0;
    let deletions = 0;
    
    operations.forEach(op => {
      if (op.type === 'INSERT') {
        additions += op.text?.length || 0;
      } else if (op.type === 'DELETE') {
        deletions += op.length || 0;
      }
    });
    
    return { additions, deletions };
  };

  const getUserColor = (authorId: string) => {
    // Simple hash to color mapping
    const colors = ['#F44747', '#007ACC', '#4EC9B0', '#FFCC02', '#C678DD', '#98C379'];
    let hash = 0;
    for (let i = 0; i < authorId.length; i++) {
      hash = authorId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="flex-1 p-4 overflow-auto">
      <h3 className="font-medium mb-3 flex items-center">
        <i className="fas fa-history mr-2"></i>
        Recent Changes
      </h3>
      
      {versions.length === 0 ? (
        <div className="text-sm text-vscode-text-dim text-center py-4">
          <i className="fas fa-clock mb-2 block"></i>
          No recent changes
        </div>
      ) : (
        <div className="space-y-3">
          {versions.map((version) => {
            const stats = getChangeStats(version.operations);
            const userColor = getUserColor(version.authorId);
            
            return (
              <div
                key={version.id}
                className="text-sm border-l-2 pl-3"
                style={{ borderLeftColor: userColor }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{version.authorName}</span>
                  <span className="text-xs text-vscode-text-dim">
                    {formatRelativeTime(version.timestamp)}
                  </span>
                </div>
                <div className="text-xs text-vscode-text-dim mb-1">
                  Version {version.version}
                  {version.operations.length > 0 && (
                    <span className="ml-2">
                      • {version.operations.length} operation{version.operations.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                {(stats.additions > 0 || stats.deletions > 0) && (
                  <div className="text-xs">
                    {stats.additions > 0 && (
                      <span className="text-vscode-success">+{stats.additions}</span>
                    )}
                    {stats.deletions > 0 && (
                      <span className="text-vscode-error ml-2">-{stats.deletions}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
