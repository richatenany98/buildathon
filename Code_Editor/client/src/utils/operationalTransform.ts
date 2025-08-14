import type { Operation } from "@/types/collaboration";

export interface InsertOperation {
  type: "INSERT";
  position: number;
  text: string;
}

export interface DeleteOperation {
  type: "DELETE";
  position: number;
  length: number;
}

export interface RetainOperation {
  type: "RETAIN";
  length: number;
}

export type OperationTransform = InsertOperation | DeleteOperation | RetainOperation;

/**
 * Generate operations to transform one text to another
 */
export function generateOperations(oldText: string, newText: string): Operation[] {
  const operations: Operation[] = [];
  
  // Simple diff algorithm - in production, use a more sophisticated diff like Myers
  let i = 0;
  let j = 0;
  
  while (i < oldText.length || j < newText.length) {
    if (i < oldText.length && j < newText.length && oldText[i] === newText[j]) {
      // Characters match, retain
      let retainLength = 0;
      while (i < oldText.length && j < newText.length && oldText[i] === newText[j]) {
        retainLength++;
        i++;
        j++;
      }
      operations.push({ type: "RETAIN", length: retainLength });
    } else if (j < newText.length && (i >= oldText.length || oldText[i] !== newText[j])) {
      // Insert new character(s)
      let insertText = "";
      const startJ = j;
      while (j < newText.length && (i >= oldText.length || oldText[i] !== newText[j])) {
        insertText += newText[j];
        j++;
      }
      operations.push({ type: "INSERT", position: i, text: insertText });
    } else if (i < oldText.length) {
      // Delete character(s)
      let deleteLength = 0;
      while (i < oldText.length && (j >= newText.length || oldText[i] !== newText[j])) {
        deleteLength++;
        i++;
      }
      operations.push({ type: "DELETE", position: i - deleteLength, length: deleteLength });
    }
  }
  
  return operations;
}

/**
 * Apply operations to transform text
 */
export function applyOperations(text: string, operations: Operation[]): string {
  let result = text;
  let offset = 0;
  
  for (const operation of operations) {
    switch (operation.type) {
      case "RETAIN":
        offset += operation.length || 0;
        break;
        
      case "INSERT":
        const insertPos = (operation.position || 0) + offset;
        result = result.slice(0, insertPos) + (operation.text || "") + result.slice(insertPos);
        offset += (operation.text || "").length;
        break;
        
      case "DELETE":
        const deletePos = (operation.position || 0) + offset;
        const deleteLength = operation.length || 0;
        result = result.slice(0, deletePos) + result.slice(deletePos + deleteLength);
        offset -= deleteLength;
        break;
    }
  }
  
  return result;
}

/**
 * Transform operation against another operation (for conflict resolution)
 */
export function transformOperation(
  operation: OperationTransform,
  otherOperation: OperationTransform,
  priority: "left" | "right" = "right"
): OperationTransform {
  if (operation.type === "RETAIN" && otherOperation.type === "RETAIN") {
    return operation;
  }
  
  if (operation.type === "INSERT" && otherOperation.type === "INSERT") {
    const opPos = operation.position;
    const otherPos = otherOperation.position;
    
    if (opPos < otherPos || (opPos === otherPos && priority === "left")) {
      return operation;
    } else {
      return {
        ...operation,
        position: opPos + otherOperation.text.length,
      };
    }
  }
  
  if (operation.type === "DELETE" && otherOperation.type === "DELETE") {
    const opPos = operation.position;
    const otherPos = otherOperation.position;
    
    if (opPos < otherPos) {
      return operation;
    } else if (opPos >= otherPos + otherOperation.length) {
      return {
        ...operation,
        position: opPos - otherOperation.length,
      };
    } else {
      // Overlapping deletes - complex case, keep operation as is for now
      return operation;
    }
  }
  
  if (operation.type === "INSERT" && otherOperation.type === "DELETE") {
    const opPos = operation.position;
    const otherPos = otherOperation.position;
    
    if (opPos <= otherPos) {
      return operation;
    } else if (opPos > otherPos + otherOperation.length) {
      return {
        ...operation,
        position: opPos - otherOperation.length,
      };
    } else {
      return {
        ...operation,
        position: otherPos,
      };
    }
  }
  
  if (operation.type === "DELETE" && otherOperation.type === "INSERT") {
    const opPos = operation.position;
    const otherPos = otherOperation.position;
    
    if (opPos < otherPos) {
      return operation;
    } else {
      return {
        ...operation,
        position: opPos + otherOperation.text.length,
      };
    }
  }
  
  return operation;
}
