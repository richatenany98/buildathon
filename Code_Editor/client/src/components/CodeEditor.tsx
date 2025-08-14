import { useEffect, useRef, useState } from "react";
import * as monaco from "monaco-editor";
import type { CursorPosition, TextSelection } from "@/types/collaboration";

interface CodeEditorProps {
  content: string;
  language: string;
  onChange: (value: string) => void;
  onCursorPositionChange: (position: CursorPosition) => void;
  onSelectionChange: (selection: TextSelection) => void;
  cursors: Array<{ userId: string; username: string; color: string; position: CursorPosition }>;
  selections: Array<{ userId: string; username: string; color: string; selection: TextSelection }>;
}

export default function CodeEditor({
  content,
  language,
  onChange,
  onCursorPositionChange,
  onSelectionChange,
  cursors,
  selections,
}: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });

  // Initialize Monaco Editor
  useEffect(() => {
    if (!containerRef.current) return;

    // Configure Monaco theme to match VS Code dark theme
    monaco.editor.defineTheme('vscode-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#1e1e1e',
        'editor.foreground': '#d4d4d4',
        'editorLineNumber.foreground': '#858585',
        'editor.selectionBackground': '#264f78',
        'editor.inactiveSelectionBackground': '#3a3d41',
      }
    });

    monaco.editor.setTheme('vscode-dark');

    // Create editor instance
    const editor = monaco.editor.create(containerRef.current, {
      value: content,
      language: language,
      theme: 'vscode-dark',
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 14,
      fontFamily: 'Monaco, Cascadia Code, Consolas, monospace',
      lineNumbers: 'on',
      wordWrap: 'on',
      tabSize: 2,
      insertSpaces: true,
    });

    editorRef.current = editor;

    // Handle content changes
    const disposable = editor.onDidChangeModelContent(() => {
      const value = editor.getValue();
      onChange(value);
    });

    // Handle cursor position changes
    const cursorDisposable = editor.onDidChangeCursorPosition((e) => {
      const position = { line: e.position.lineNumber, column: e.position.column };
      setCursorPosition(position);
      onCursorPositionChange(position);
    });

    // Handle selection changes
    const selectionDisposable = editor.onDidChangeCursorSelection((e) => {
      if (!e.selection.isEmpty()) {
        onSelectionChange({
          startLine: e.selection.startLineNumber,
          startColumn: e.selection.startColumn,
          endLine: e.selection.endLineNumber,
          endColumn: e.selection.endColumn,
        });
      }
    });

    return () => {
      disposable.dispose();
      cursorDisposable.dispose();
      selectionDisposable.dispose();
      editor.dispose();
    };
  }, []);

  // Update content when prop changes
  useEffect(() => {
    if (editorRef.current && editorRef.current.getValue() !== content) {
      editorRef.current.setValue(content);
    }
  }, [content]);

  // Update language when prop changes
  useEffect(() => {
    if (editorRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        monaco.editor.setModelLanguage(model, language);
      }
    }
  }, [language]);

  return (
    <div className="relative h-full bg-vscode-bg">
      {/* Monaco Editor Container */}
      <div ref={containerRef} className="h-full w-full" />
      
      {/* Collaborative cursors overlay - positioned over Monaco */}
      <div className="absolute inset-0 pointer-events-none">
        {cursors.map((cursor) => (
          <div
            key={cursor.userId}
            className="absolute text-xs"
            style={{
              top: `${(cursor.position.line - 1) * 18 + 4}px`,
              left: `${(cursor.position.column - 1) * 8 + 60}px`, // Account for line numbers
              zIndex: 1000,
            }}
          >
            <div
              className="w-0.5 h-4"
              style={{ backgroundColor: cursor.color }}
            />
            <div
              className="absolute -top-5 left-0 px-1 py-0.5 text-white text-xs rounded whitespace-nowrap"
              style={{ backgroundColor: cursor.color }}
            >
              {cursor.username}
            </div>
          </div>
        ))}
      </div>
      
      {/* Status Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 px-4 py-1 flex items-center justify-between text-xs text-gray-300">
        <div className="flex items-center space-x-4">
          <span>{language.charAt(0).toUpperCase() + language.slice(1)}</span>
          <span>UTF-8</span>
          <span>LF</span>
          <span>Ln {cursorPosition.line}, Col {cursorPosition.column}</span>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-gray-500">Last sync: just now</span>
          <div className="flex items-center space-x-1">
            <span className="text-green-400">●</span>
            <span>Auto-saved</span>
          </div>
        </div>
      </div>
    </div>
  );
}
