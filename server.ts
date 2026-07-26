import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import uploadHandler from "./api/upload";
import recordsHandler from "./api/records";
import renameHandler from "./api/admin/rename";
import tournamentListHandler from "./api/tournament/list";
import tournamentGetHandler from "./api/tournament/get";
import tournamentSaveHandler from "./api/tournament/save";
import tournamentDeleteHandler from "./api/tournament/delete";

// Setup express app
const app = express();
const PORT = 3000;

app.use(express.json());

// API routes mapped from the modular handlers
app.post("/api/upload", uploadHandler);
app.get("/api/records", recordsHandler);
app.post("/api/admin/rename", renameHandler);

// Tournament API routes
app.get("/api/tournament/list", tournamentListHandler);
app.get("/api/tournament/get", tournamentGetHandler);
app.post("/api/tournament/save", tournamentSaveHandler);
app.post("/api/tournament/delete", tournamentDeleteHandler);

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
