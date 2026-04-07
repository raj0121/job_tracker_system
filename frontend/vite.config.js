import process from "node:process";
import path from "path";
import { fileURLToPath } from "url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const rawPort = Number(env.VITE_DEV_PORT || env.PORT || 5173);
  const devPort = Number.isFinite(rawPort) && rawPort > 0 ? rawPort : 5173;

  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  return {
    plugins: [react()],
    server: {
      host: "localhost",
      port: devPort,
      strictPort: true,
      hmr: {
        host: "localhost",
        port: devPort,
        clientPort: devPort,
        protocol: "ws"
      }
    },
    resolve: {
      dedupe: ["react", "react-dom"],
      alias: {
        react: path.resolve(__dirname, "node_modules/react"),
        "react-dom": path.resolve(__dirname, "node_modules/react-dom")
      }
    },
    optimizeDeps: {
      include: ["react", "react-dom", "@tanstack/react-query"]
    }
  };
});
