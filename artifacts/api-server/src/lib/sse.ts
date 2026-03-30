import type { Response } from "express";

interface SSEClient {
  id: string;
  res: Response;
  userId?: number;
}

const clients = new Map<string, SSEClient>();

export function addSSEClient(id: string, res: Response, userId?: number): () => void {
  clients.set(id, { id, res, userId });
  return () => clients.delete(id);
}

/** Broadcast to ALL connected clients */
export function broadcastSSE(event: string, data: unknown): void {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const [id, client] of clients) {
    try {
      client.res.write(payload);
    } catch {
      clients.delete(id);
    }
  }
}

/** Send to ONE specific user (all their open tabs/windows) */
export function sendSSEToUser(userId: number, event: string, data: unknown): void {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const [id, client] of clients) {
    if (client.userId === userId) {
      try {
        client.res.write(payload);
      } catch {
        clients.delete(id);
      }
    }
  }
}

/** Check if a specific user has any active connections */
export function isUserConnected(userId: number): boolean {
  for (const client of clients.values()) {
    if (client.userId === userId) return true;
  }
  return false;
}

export function getClientCount(): number {
  return clients.size;
}
