import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import apiHandler from "./api/index";

// Setup express app
const app = express();
const PORT = 3000;

app.use(express.json());

// Forward all /api/* requests to the single API handler in api/index.ts
app.all("/api/*all", (req, res) => {
  return apiHandler(req as any, res as any);
});

// Express global error middleware for API routes to guarantee JSON error response
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled API error:", err);
  res.setHeader("Content-Type", "application/json");
  res.status(500).json({ error: err?.message || "Internal server error" });
});

// Serve frontend assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
