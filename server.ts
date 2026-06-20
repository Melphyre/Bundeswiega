import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import uploadHandler from "./api/upload";
import recordsHandler from "./api/records";

// Setup express app
const app = express();
const PORT = 3000;

app.use(express.json());

// API routes mapped from the modular handlers
app.post("/api/upload", uploadHandler);
app.get("/api/records", recordsHandler);

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
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
