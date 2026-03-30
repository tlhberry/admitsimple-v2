import { Router } from "express";
import { requireAuth } from "../lib/requireAuth";
import { addSSEClient } from "../lib/sse";

const router = Router();

/**
 * GET /api/events
 * Server-Sent Events stream for real-time push notifications.
 * Authenticated users subscribe here; server pushes events without polling.
 */
router.get("/events", requireAuth, (req, res) => {
  const sess = req.session as any;
  const userId: number | undefined = sess?.userId ? Number(sess.userId) : undefined;
  const clientId = `${userId ?? "anon"}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  // Initial handshake
  res.write(`event: connected\ndata: {"clientId":"${clientId}"}\n\n`);

  const cleanup = addSSEClient(clientId, res, userId);

  // Keep-alive every 25 seconds to avoid proxy timeouts
  const ping = setInterval(() => {
    try {
      res.write("event: ping\ndata: {}\n\n");
    } catch {
      clearInterval(ping);
    }
  }, 25000);

  req.on("close", () => {
    clearInterval(ping);
    cleanup();
  });
});

export default router;
