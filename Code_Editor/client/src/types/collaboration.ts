export interface CursorPosition {
  line: number;
  column: number;
}

export interface TextSelection {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

export interface CollaborativeUser {
  id: string;
  username: string;
  color: string;
  isActive?: boolean;
  currentLine?: number;
}

export interface Operation {
  type: "INSERT" | "DELETE" | "RETAIN";
  position?: number;
  text?: string;
  length?: number;
}

export interface DocumentChange {
  operations: Operation[];
  content: string;
  version: number;
  authorId: string;
  authorName: string;
}
