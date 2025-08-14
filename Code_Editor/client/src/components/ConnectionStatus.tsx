interface ConnectionStatusProps {
  isConnected: boolean;
}

export default function ConnectionStatus({ isConnected }: ConnectionStatusProps) {
  return (
    <div className="flex items-center space-x-2">
      <div 
        className={`w-2 h-2 rounded-full ${
          isConnected 
            ? 'bg-vscode-success animate-pulse' 
            : 'bg-vscode-error'
        }`}
      />
      <span className="text-sm">
        {isConnected ? 'Connected' : 'Disconnected'}
      </span>
    </div>
  );
}
