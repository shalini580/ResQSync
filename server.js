import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import cors from "cors";
import dotenv from "dotenv";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { apiRouter } from "./src/server/routes.js";
import { initDatabase } from "./src/server/db.js";
dotenv.config({ quiet: true });
const app = express();
const PORT = Number.parseInt(process.env.PORT || "3000", 10);
const HOST = "127.0.0.1";
const isProd = process.env.NODE_ENV === "production";
async function startServer() {
  // Ensure native C OS Kernel binary is compiled from modular C source files
  const cDir = path.resolve(process.cwd(), "c_engine");
  const cBinPath = path.resolve(cDir, "os_kernel");
  const cMainPath = path.resolve(cDir, "main.c");
  if (fs.existsSync(cMainPath) && !fs.existsSync(cBinPath)) {
    try {
      const { execSync } = await import("child_process");
      console.log(
        "[ResQSync Server] Compiling modular C OS Kernel (main.c, pcb.c, cpu_scheduler.c, synchronization.c, ipc_pipe.c, bankers_algorithm.c, deadlock.c) with GCC...",
      );
      execSync(
        `cd "${cDir}" && gcc -Wall -Wextra -O2 -pthread -std=c11 -D_GNU_SOURCE -o os_kernel main.c pcb.c cpu_scheduler.c synchronization.c ipc_pipe.c bankers_algorithm.c deadlock.c`,
      );
      console.log("Native Modular C OS Kernel compiled successfully!");
    } catch (cErr) {
      console.warn(" Could not compile C kernel:", cErr.message);
    }
  }

  await initDatabase();
  app.use(cors());
  app.use(express.json());
  app.use("/api", apiRouter);
  if (isProd) {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: HOST,
        port: PORT,
        hmr: false,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }
  const server = app.listen(PORT, HOST);
  server.on("listening", () => {
    const address = server.address();
    if (address && typeof address === "object") {
      console.log(` http://localhost:${address.port}`);
    }
  });
  if (process.stdin.isTTY) {
    const terminal = createInterface({ input: process.stdin });
    terminal.on("line", (line) => {
      const command = line.trim().toLowerCase();
      if (command === "q") {
        terminal.close();
        shutdown();
        return;
      }
      if (command !== "o") return;

      const address = server.address();
      if (!address || typeof address !== "object") {
        console.error("Server is not listening yet.");
        return;
      }

      const url = `http://localhost:${address.port}`;
      const browserCommand =
        process.platform === "win32"
          ? "rundll32.exe"
          : process.platform === "darwin"
            ? "open"
            : "xdg-open";
      const args =
        process.platform === "win32"
          ? ["url.dll,FileProtocolHandler", url]
          : [url];
      const browser = spawn(browserCommand, args, { detached: true, stdio: "ignore" });
      browser.on("error", (err) => {
        console.error("Could not open the local site:", err.message);
      });
      browser.unref();
    });
  }
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      server.listen(0, HOST);
    } else {
      console.error("Server error:", err);
    }
  });
  let isShuttingDown = false;
  const shutdown = () => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    server.close(() => {
      process.exit(0);
    });
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}
startServer().catch((err) => {
  console.error(" Failed to start server:", err);
  process.exit(1);
});
