import type { CollaborativeUser } from "@/types/collaboration";

interface UserListProps {
  users: CollaborativeUser[];
}

export default function UserList({ users }: UserListProps) {
  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  const getStatusText = (user: CollaborativeUser) => {
    if (user.isActive) {
      return user.currentLine ? `Editing line ${user.currentLine}` : 'Online';
    }
    return 'Away';
  };

  return (
    <div className="p-4 border-b border-vscode-border">
      <h2 className="font-semibold mb-3 flex items-center">
        <i className="fas fa-users mr-2"></i>
        Collaborators
      </h2>
      
      <div className="space-y-2">
        {users.length === 0 ? (
          <div className="text-sm text-vscode-text-dim text-center py-4">
            <i className="fas fa-user-slash mb-2 block"></i>
            No other users online
          </div>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-vscode-border transition-colors"
            >
              <div className="relative">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                  style={{ backgroundColor: user.color }}
                >
                  {getInitials(user.username)}
                </div>
                <div 
                  className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-vscode-sidebar ${
                    user.isActive ? 'bg-vscode-success' : 'bg-vscode-warning'
                  }`}
                />
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm">{user.username}</div>
                <div className="text-xs text-vscode-text-dim">
                  {getStatusText(user)}
                </div>
              </div>
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: user.color }}
                title="User color indicator"
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
