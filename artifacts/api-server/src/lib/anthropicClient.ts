import Anthropic from "@anthropic-ai/sdk";
import { db } from "@workspace/db";
import { settings } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

export async function getAnthropicClient(): Promise<Anthropic> {
  const [row] = await db.select().from(settings).where(eq(settings.key, "anthropic_api_key"));
  const dbKey = row?.value?.trim();

  if (dbKey) {
    return new Anthropic({ apiKey: dbKey });
  }

  return new Anthropic({
    apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
  });
}
