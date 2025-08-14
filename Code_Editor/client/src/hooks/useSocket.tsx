import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { useToast } from "@/hooks/use-toast";
import type { CollaborativeUser } from "@/types/collaboration";

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [users, setUsers] = useState<CollaborativeUser[]>([]);
  const { toast } = useToast();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    const newSocket = io({
      transports: ['websocket'],
      upgrade: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: maxReconnectAttempts,
      timeout: 20000,
    });

    newSocket.on("connect", () => {
      setIsConnected(true);
      reconnectAttempts.current = 0;
      console.log("Connected to server");
      
      toast({
        title: "Connected",
        description: "Successfully connected to collaboration server.",
      });
    });

    newSocket.on("disconnect", (reason) => {
      setIsConnected(false);
      console.log("Disconnected from server:", reason);
      
      if (reason === "io server disconnect") {
        newSocket.connect();
      }
    });

    newSocket.on("connect_error", (error) => {
      setIsConnected(false);
      reconnectAttempts.current++;
      
      console.error("Connection error:", error);
      
      if (reconnectAttempts.current >= maxReconnectAttempts) {
        toast({
          title: "Connection failed",
          description: "Unable to connect to collaboration server. Please refresh the page.",
          variant: "destructive",
        });
      }
    });

    newSocket.on("user-joined", (user: CollaborativeUser) => {
      setUsers(prev => {
        const exists = prev.some(u => u.id === user.id);
        if (!exists) {
          toast({
            title: "User joined",
            description: `${user.username} joined the document.`,
          });
          return [...prev, { ...user, isActive: true }];
        }
        return prev;
      });
    });

    newSocket.on("user-left", (user: { id: string; username: string }) => {
      setUsers(prev => {
        const filtered = prev.filter(u => u.id !== user.id);
        toast({
          title: "User left",
          description: `${user.username} left the document.`,
        });
        return filtered;
      });
    });

    newSocket.on("users-list", (usersList: CollaborativeUser[]) => {
      setUsers(usersList.map(user => ({ ...user, isActive: true })));
    });

    newSocket.on("error", (error: { message: string }) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [toast]);

  return {
    socket,
    isConnected,
    users,
  };
}
