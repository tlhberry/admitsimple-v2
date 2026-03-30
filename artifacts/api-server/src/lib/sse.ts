import type { Response } from "express";

interface SSEClient {
  id: string;
  res: Response;
}

const clients = new Map<string, SSEClient>();

export function addSSEClient(id: string, res: Response): () => void {
  clients.set(id, { id, res });
  return () => clients.delete(id);
}

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

export function getClientCount(): number {
  return clients.size;
}
