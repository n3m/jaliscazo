# Admin Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a secret admin mode to Jaliscazo that allows editing and deleting reports, activated via a long-press gesture on the title with password authentication.

**Architecture:** Password stored as `ADMIN_PASSWORD` env var. Each admin API request sends the password in an `Authorization: Bearer <password>` header. Server-side helper validates it. React Context manages admin state client-side. Admin controls appear inline in the existing report popup.

**Tech Stack:** Next.js 16 App Router, Drizzle ORM, React Context, sessionStorage

---

### Task 1: Server-side admin auth helper

**Files:**
- Create: `src/lib/admin.ts`

**Step 1: Create the verifyAdmin helper**

```typescript
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
```

**Step 2: Commit**

```bash
git add src/lib/admin.ts
git commit -m "feat(admin): add server-side verifyAdmin helper"
```

---

### Task 2: Admin auth validation endpoint

**Files:**
- Create: `src/app/api/admin/auth/route.ts`

**Step 1: Create the auth validation route**

This endpoint exists solely to validate the password at login time (so the client doesn't store a wrong password).

```typescript
// src/app/api/admin/auth/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { password } = body;

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
```

**Step 2: Commit**

```bash
git add src/app/api/admin/auth/route.ts
git commit -m "feat(admin): add POST /api/admin/auth validation endpoint"
```

---

### Task 3: DELETE and PATCH endpoints for reports

**Files:**
- Create: `src/app/api/reports/[id]/route.ts`

**Step 1: Create the admin report management route**

This file is separate from the existing `vote/route.ts`. It handles DELETE and PATCH on `/api/reports/[id]`.

```typescript
// src/app/api/reports/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { reports, votes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyAdmin } from "@/lib/admin";
import { computeScore } from "@/lib/scoring";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = verifyAdmin(request);
  if (unauthorized) return unauthorized;

  const { id } = await params;

  // Check report exists
  const [report] = await db
    .select()
    .from(reports)
    .where(eq(reports.id, id));

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  // Votes cascade-delete via FK constraint
  await db.delete(reports).where(eq(reports.id, id));

  return NextResponse.json({ ok: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = verifyAdmin(request);
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const body = await request.json();

  // Check report exists
  const [report] = await db
    .select()
    .from(reports)
    .where(eq(reports.id, id));

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  // Build update object from allowed fields
  const updates: Record<string, unknown> = {};
  if (body.type && ["armed_confrontation", "road_blockade", "cartel_activity"].includes(body.type)) {
    updates.type = body.type;
  }
  if (body.status && ["unconfirmed", "confirmed", "denied", "expired"].includes(body.status)) {
    updates.status = body.status;
  }
  if (body.description !== undefined) {
    updates.description = body.description || null;
  }
  if (body.sourceUrl !== undefined) {
    updates.sourceUrl = body.sourceUrl || null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  await db.update(reports).set(updates).where(eq(reports.id, id));

  // Fetch updated report with vote counts
  const [updatedReport] = await db
    .select()
    .from(reports)
    .where(eq(reports.id, id));

  const reportVotes = await db
    .select()
    .from(votes)
    .where(eq(votes.reportId, id));

  const { score } = computeScore(
    reportVotes.map((v) => ({ voteType: v.voteType, createdAt: v.createdAt }))
  );

  const confirmCount = reportVotes.filter((v) => v.voteType === "confirm").length;
  const denyCount = reportVotes.filter((v) => v.voteType === "deny").length;

  return NextResponse.json({
    id: updatedReport.id,
    type: updatedReport.type,
    latitude: parseFloat(updatedReport.latitude),
    longitude: parseFloat(updatedReport.longitude),
    description: updatedReport.description,
    sourceUrl: updatedReport.sourceUrl,
    status: updatedReport.status,
    createdAt: updatedReport.createdAt.toISOString(),
    lastActivityAt: updatedReport.lastActivityAt.toISOString(),
    score,
    confirmCount,
    denyCount,
  });
}
```

**Step 2: Verify type-check passes**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/app/api/reports/[id]/route.ts
git commit -m "feat(admin): add DELETE and PATCH /api/reports/[id] endpoints"
```

---

### Task 4: AdminContext and provider

**Files:**
- Create: `src/components/admin-context.tsx`

**Step 1: Create the admin context**

```typescript
// src/components/admin-context.tsx
"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

interface AdminContextValue {
  isAdmin: boolean;
  password: string | null;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
}

const AdminContext = createContext<AdminContextValue>({
  isAdmin: false,
  password: null,
  login: async () => false,
  logout: () => {},
});

export function useAdmin() {
  return useContext(AdminContext);
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const [password, setPassword] = useState<string | null>(null);

  // Restore from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem("jaliscazo_admin_pw");
    if (stored) {
      setPassword(stored);
    }
  }, []);

  const login = useCallback(async (pw: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      if (res.ok) {
        setPassword(pw);
        sessionStorage.setItem("jaliscazo_admin_pw", pw);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setPassword(null);
    sessionStorage.removeItem("jaliscazo_admin_pw");
  }, []);

  return (
    <AdminContext.Provider value={{ isAdmin: !!password, password, login, logout }}>
      {children}
    </AdminContext.Provider>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/admin-context.tsx
git commit -m "feat(admin): add AdminContext with login/logout and sessionStorage persistence"
```

---

### Task 5: Admin password dialog component

**Files:**
- Create: `src/components/admin-login-dialog.tsx`

**Step 1: Create the password dialog**

Minimal dialog that appears when the user long-presses the title. Matches existing app styling (font-display, font-mono, zinc palette, rounded-2xl bottom sheet pattern).

```typescript
// src/components/admin-login-dialog.tsx
"use client";

import { useState, useEffect } from "react";
import { useAdmin } from "./admin-context";

interface AdminLoginDialogProps {
  onClose: () => void;
}

export function AdminLoginDialog({ onClose }: AdminLoginDialogProps) {
  const { login } = useAdmin();
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(false);
    setLoading(true);

    const ok = await login(pw);
    setLoading(false);

    if (ok) {
      handleClose();
    } else {
      setError(true);
    }
  };

  return (
    <>
      <div
        className={`absolute inset-0 z-[2001] bg-black/20 transition-opacity duration-200 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
      />
      <div
        className={`absolute bottom-0 left-0 right-0 z-[2002] transition-transform duration-300 ease-out ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="bg-white border-t border-zinc-200 rounded-t-2xl p-5 pb-8 max-w-sm mx-auto shadow-[0_-4px_30px_rgba(0,0,0,0.1)]">
          <div className="flex justify-center mb-4">
            <div className="w-10 h-1 rounded-full bg-zinc-300" />
          </div>
          <h2 className="font-display font-bold text-zinc-900 text-lg uppercase tracking-wide mb-4">
            Acceso Admin
          </h2>
          <form onSubmit={handleSubmit}>
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="Contrasena"
              autoFocus
              className="w-full px-4 py-3 rounded-xl border border-zinc-300 font-mono text-base text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 mb-3"
            />
            {error && (
              <p className="font-mono text-sm text-rose-600 mb-3">
                Contrasena incorrecta
              </p>
            )}
            <button
              type="submit"
              disabled={loading || !pw}
              className="w-full py-3 rounded-xl bg-zinc-900 text-white font-display font-bold text-base tracking-widest uppercase transition-all hover:bg-zinc-800 active:scale-95 disabled:opacity-50"
            >
              {loading ? "Verificando..." : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/admin-login-dialog.tsx
git commit -m "feat(admin): add AdminLoginDialog password entry component"
```

---

### Task 6: Wire admin into map.tsx (long-press + provider + indicator)

**Files:**
- Modify: `src/components/map.tsx`

**Step 1: Wrap map content with AdminProvider, add long-press gesture and admin dialog**

Changes to `map.tsx`:

1. Import `AdminProvider`, `useAdmin`, `AdminLoginDialog`
2. Wrap the entire return JSX with `<AdminProvider>`
3. Add long-press handler on the title `<div>` (3 second touch/click-hold)
4. Add state for showing the admin login dialog
5. Add subtle admin indicator dot next to the title when `isAdmin` is true
6. When admin is already active and long-press again, call `logout()` instead

Extract the inner content to a separate component (`MapInner`) so `useAdmin()` can be called inside the provider.

The long-press implementation:
- `onPointerDown` starts a 3-second `setTimeout`
- `onPointerUp` / `onPointerLeave` / `onPointerCancel` clears it
- If the timer fires, toggle admin dialog or logout

**Step 2: Verify it renders without errors**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/components/map.tsx
git commit -m "feat(admin): wire long-press activation, provider, and indicator into map"
```

---

### Task 7: Add admin controls to report-popup.tsx

**Files:**
- Modify: `src/components/report-popup.tsx`

**Step 1: Add admin editing and deletion UI**

Changes to `report-popup.tsx`:

1. Import `useAdmin` from `admin-context`
2. Add new props: `onReportDeleted: (id: string) => void` and `onReportUpdated: (report: Report) => void`
3. Add state: `editing`, `deleting`, `editForm` (object with type/description/sourceUrl/status fields)
4. When `isAdmin` is true and not editing, show an admin section below vote buttons:
   - Thin `border-t border-zinc-200` divider
   - "ADMIN" label in font-mono text-xs text-zinc-400
   - Two buttons side by side: "Editar" (zinc style) and "Eliminar" (rose style)
5. Delete flow:
   - Click "Eliminar" → `deleting = true`, button text changes to "Confirmar eliminacion?" with a cancel button
   - Click confirm → `DELETE /api/reports/${id}` with `Authorization: Bearer ${password}` header
   - On success → call `onReportDeleted(report.id)` and close popup
6. Edit flow:
   - Click "Editar" → `editing = true`, fields become inputs:
     - Type: `<select>` with three options (armed_confrontation, road_blockade, cartel_activity)
     - Status: `<select>` with four options (unconfirmed, confirmed, denied, expired)
     - Description: `<textarea>`
     - Source URL: `<input type="url">`
   - "Guardar" and "Cancelar" buttons
   - On save → `PATCH /api/reports/${id}` with `Authorization` header and changed fields
   - On success → call `onReportUpdated(updatedReport)` and exit edit mode

**Step 2: Update map.tsx to pass the new props**

In `map.tsx`, add handlers:
- `handleReportDeleted(id: string)`: removes report from state, closes popup
- `handleReportUpdated(report: Report)`: updates report in state, updates selectedReport

Pass them to `<ReportPopup>`.

**Step 3: Verify type-check**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```bash
git add src/components/report-popup.tsx src/components/map.tsx
git commit -m "feat(admin): add edit/delete controls to report popup with admin auth"
```

---

### Task 8: Manual smoke test and final verification

**Step 1: Add ADMIN_PASSWORD to .env.local**

Ensure `.env.local` has `ADMIN_PASSWORD=<your-chosen-password>`.

**Step 2: Run the dev server**

Run: `npm run dev`

**Step 3: Test the full flow**

1. Open the app in browser
2. Long-press "Jaliscazo" title for 3 seconds → admin dialog should appear
3. Enter wrong password → "Contrasena incorrecta" error
4. Enter correct password → dialog closes, small indicator dot appears
5. Click a report marker → popup shows admin section with "Editar" and "Eliminar"
6. Test edit: change description, save → report updates
7. Test delete: click "Eliminar", confirm → report disappears
8. Long-press title again → admin mode deactivates, indicator disappears
9. Click a report → no admin controls visible

**Step 4: Run type-check**

Run: `npx tsc --noEmit`

**Step 5: Run build**

Run: `npm run build`

**Step 6: Final commit if any adjustments were needed**

```bash
git add -A
git commit -m "feat(admin): finalize admin mode implementation"
```
