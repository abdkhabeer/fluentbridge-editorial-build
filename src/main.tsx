import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { captureAttribution } from "./lib/analytics/client";

captureAttribution();

createRoot(document.getElementById("root")!).render(<App />);
