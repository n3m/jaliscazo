import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyAdmin } from "@/lib/admin";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  const unauthorized = verifyAdmin(request);
  if (unauthorized) return unauthorized;

  const { messageId } = await params;

  const [message] = await db
    .select()
    .from(messages)
    .where(eq(messages.id, messageId));

  if (!message) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  await db.delete(messages).where(eq(messages.id, messageId));

  return NextResponse.json({ ok: true });
}
