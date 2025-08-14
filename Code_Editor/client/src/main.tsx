import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Configure Monaco Editor to work without workers
(window as any).MonacoEnvironment = {
  getWorker: () => {
    // Disable workers by returning null
    return null;
  }
};

createRoot(document.getElementById("root")!).render(<App />);
