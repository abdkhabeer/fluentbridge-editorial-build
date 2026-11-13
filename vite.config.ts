import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { devApiPlugin } from "./server/devPlugin";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), devApiPlugin(loadEnv(mode, process.cwd(), ""))],
  // Build-time settings exposed to the browser, listed by exact name (see
  // src/lib/featureFlags.ts). Vite matches these as prefixes, so a broad
  // prefix such as "FEATURE_" would also ship Netlify's own FEATURE_FLAGS
  // build variable. Add a variable here only when the client reads it, and
  // never one that holds a secret.
  envPrefix: ["FEATURE_TRIAL_REFUND_COPY", "FEATURE_REVIEW_SLA_COPY", "FEATURE_LEAD_ATTRIBUTION", "BOOKING_URL"],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
