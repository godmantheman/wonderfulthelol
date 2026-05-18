import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// GitHub Pages에서 하얀 화면 방지:
// base: "./" 로 두면 저장소 이름이 무엇이든 assets 경로가 상대 경로로 잡힙니다.
export default defineConfig({
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
