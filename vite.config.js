import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/Projet_DATAView-Hackaton/",
  plugins: [react()],
  build: {
    outDir: "docs",
    emptyOutDir: true
  }
});
