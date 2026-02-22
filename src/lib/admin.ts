// src/lib/admin.ts
import { NextRequest, NextResponse } from "next/server";

export function verifyAdmin(request: NextRequest): NextResponse | null {
  const authHeader = request.headers.get("authorization");
  const password = authHeader?.replace("Bearer ", "");

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null; // null means authorized
}
