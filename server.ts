import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createClerkClient } from "@clerk/backend";

const clerkSecretKey = process.env.CLERK_SECRET_KEY;

if (!clerkSecretKey) {
  console.error('CLERK_SECRET_KEY fehlt in Environment Variables!');
} else {
  console.log('CLERK_SECRET_KEY vorhanden:', clerkSecretKey.substring(0, 10) + '...');
}

export const clerk = createClerkClient({
  secretKey: clerkSecretKey || ''
});

import uploadHandler from "./api/upload";
import recordsHandler from "./api/records";
import renameHandler from "./api/admin/rename";
import tournamentListHandler from "./api/tournament/list";
import tournamentGetHandler from "./api/tournament/get";
import tournamentSaveHandler from "./api/tournament/save";
import tournamentDeleteHandler from "./api/tournament/delete";
import usersListHandler from "./api/users/list";
import updatePrivacyHandler from "./api/users/update-privacy";
import assignToAccountHandler from "./api/admin/assign-to-account";
import publicRecordsHandler from "./api/users/public-records";
import saveResultHandler from "./api/users/save-result";

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

// Users API routes
app.get("/api/users/list", usersListHandler);
app.post("/api/users/update-privacy", updatePrivacyHandler);
app.get("/api/users/public-records", publicRecordsHandler);
app.post("/api/users/save-result", saveResultHandler);
app.get('/api/users/check-username', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { username, currentUserId } = req.query as { username?: string; currentUserId?: string };
    if (!username) return res.status(400).json({ error: 'Username fehlt' });

    const users = await clerk.users.getUserList({ limit: 100 });
    const taken = users.data.some(u =>
      (u.username?.toLowerCase() === username.toLowerCase() ||
       (`${u.firstName || ''} ${u.lastName || ''}`.trim().toLowerCase() === username.toLowerCase())) &&
      u.id !== currentUserId
    );
    return res.status(200).json({ taken, username });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
app.post('/api/users/delete', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId fehlt' });
    await clerk.users.deleteUser(userId);
    return res.status(200).json({ message: 'Account gelöscht' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin API routes
app.post("/api/admin/assign-to-account", assignToAccountHandler);

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
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
