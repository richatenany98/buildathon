import { useEffect, useState, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { applyOperations, generateOperations } from "@/utils/operationalTransform";
import type { Socket } from "socket.io-client";
import type { CursorPosition, TextSelection, Operation } from "@/types/collaboration";

interface CursorData {
  userId: string;
  username: string;
  color: string;
  position: CursorPosition;
}

interface SelectionData {
  userId: string;
  username: string;
  color: string;
  selection: TextSelection;
}

export function useCollaborativeEditor(socket: Socket | null, documentId: string) {
  const [content, setContent] = useState("");
  const [version, setVersion] = useState(1);
  const [cursors, setCursors] = useState<CursorData[]>([]);
  const [selections, setSelections] = useState<SelectionData[]>([]);
  const [isJoined, setIsJoined] = useState(false);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const lastContentRef = useRef("");
  const pendingOperations = useRef<Operation[]>([]);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Use authenticated user's username, or generate a guest username
  const username = useRef(
    user?.username || `Guest_${Math.random().toString(36).substring(2, 8)}`
  ).current;

  // Join document when socket connects
  useEffect(() => {
    if (socket && !isJoined) {
      socket.emit("user-join", { username, documentId });
      setIsJoined(true);
    }
  }, [socket, documentId, username, isJoined]);

  // Listen for document sync
  useEffect(() => {
    if (!socket) return;

    const handleDocumentSync = (data: { content: string; version: number }) => {
      setContent(data.content);
      setVersion(data.version);
      lastContentRef.current = data.content;
    };

    const handleTextChange = (data: {
      operations: Operation[];
      content: string;
      version: number;
      authorId: string;
      authorName: string;
    }) => {
      try {
        // Apply remote operations to current content
        const newContent = applyOperations(content, data.operations);
        setContent(newContent);
        setVersion(data.version);
        lastContentRef.current = newContent;
      } catch (error) {
        console.error("Failed to apply remote operations:", error);
        // Request full document sync if operations fail
        socket.emit("request-sync", { documentId });
      }
    };

    const handleCursorPosition = (data: CursorData) => {
      setCursors(prev => {
        const filtered = prev.filter(c => c.userId !== data.userId);
        return [...filtered, data];
      });
      
      // Remove cursor after 30 seconds of inactivity
      setTimeout(() => {
        setCursors(prev => prev.filter(c => c.userId !== data.userId));
      }, 30000);
    };

    const handleTextSelection = (data: SelectionData) => {
      setSelections(prev => {
        const filtered = prev.filter(s => s.userId !== data.userId);
        return [...filtered, data];
      });
      
      // Remove selection after 10 seconds
      setTimeout(() => {
        setSelections(prev => prev.filter(s => s.userId !== data.userId));
      }, 10000);
    };

    socket.on("document-sync", handleDocumentSync);
    socket.on("text-change", handleTextChange);
    socket.on("cursor-position", handleCursorPosition);
    socket.on("text-selection", handleTextSelection);

    return () => {
      socket.off("document-sync", handleDocumentSync);
      socket.off("text-change", handleTextChange);
      socket.off("cursor-position", handleCursorPosition);
      socket.off("text-selection", handleTextSelection);
    };
  }, [socket, content, documentId]);

  // Debounced save function
  const debouncedSave = useCallback((newContent: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      if (socket && newContent !== lastContentRef.current) {
        try {
          const operations = generateOperations(lastContentRef.current, newContent);
          const newVersion = version + 1;
          
          socket.emit("text-change", {
            documentId,
            operations,
            content: newContent,
            version: newVersion,
          });
          
          setVersion(newVersion);
          lastContentRef.current = newContent;
        } catch (error) {
          console.error("Failed to generate operations:", error);
          toast({
            title: "Save failed",
            description: "Failed to save changes. Please try again.",
            variant: "destructive",
          });
        }
      }
    }, 300); // 300ms debounce
  }, [socket, documentId, version, toast]);

  const onContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    debouncedSave(newContent);
  }, [debouncedSave]);

  const onCursorPositionChange = useCallback((position: CursorPosition) => {
    if (socket) {
      socket.emit("cursor-position", { documentId, position });
    }
  }, [socket, documentId]);

  const onSelectionChange = useCallback((selection: TextSelection) => {
    if (socket) {
      socket.emit("text-selection", { documentId, selection });
    }
  }, [socket, documentId]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    content,
    onContentChange,
    onCursorPositionChange,
    onSelectionChange,
    cursors,
    selections,
    version,
  };
}
