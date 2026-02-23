# New Report Types Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add three new report types (Rapiña, Peligro General, Actividad Criminal) to the map.

**Architecture:** Extend the existing `report_type` PostgreSQL enum with 3 new values, update the TypeScript union type, and add the corresponding emoji/color/label entries to every UI component that renders report type info. No behavioral changes.

**Tech Stack:** PostgreSQL enum (ALTER TYPE), Drizzle ORM, Next.js App Router, React, Tailwind CSS v4, Leaflet

---

### Task 1: Database schema + migration

**Files:**
- Modify: `src/db/schema.ts:10-15`
- Modify: `src/types/index.ts:1`

**Step 1: Add new enum values to the Drizzle schema**

In `src/db/schema.ts`, replace the `reportTypeEnum` definition:

```typescript
export const reportTypeEnum = pgEnum("report_type", [
  "armed_confrontation",
  "road_blockade",
  "cartel_activity",
  "building_fire",
  "looting",
  "general_danger",
  "criminal_activity",
]);
```

**Step 2: Update the TypeScript union type**

In `src/types/index.ts`, replace line 1:

```typescript
export type ReportType = "armed_confrontation" | "road_blockade" | "cartel_activity" | "building_fire" | "looting" | "general_danger" | "criminal_activity";
```

**Step 3: Generate and review the Drizzle migration**

Run: `npm run db:generate`

Verify the generated SQL contains three `ALTER TYPE` statements:
```sql
ALTER TYPE "public"."report_type" ADD VALUE 'looting';
ALTER TYPE "public"."report_type" ADD VALUE 'general_danger';
ALTER TYPE "public"."report_type" ADD VALUE 'criminal_activity';
```

**Step 4: Apply the migration**

Run: `npm run db:migrate`

Expected: Migration applies successfully.

**Step 5: Type-check**

Run: `npx tsc --noEmit`

Expected: Type errors in API route validation arrays (we'll fix in Task 2). Note these but proceed.

**Step 6: Commit**

```bash
git add src/db/schema.ts src/types/index.ts drizzle/
git commit -m "feat: add looting, general_danger, criminal_activity to report_type enum"
```

---

### Task 2: API route validation

**Files:**
- Modify: `src/app/api/reports/route.ts:103`
- Modify: `src/app/api/reports/[id]/route.ts:54`

**Step 1: Update POST validation in reports route**

In `src/app/api/reports/route.ts`, replace lines 103-108:

```typescript
  if (!["armed_confrontation", "road_blockade", "cartel_activity", "building_fire", "looting", "general_danger", "criminal_activity"].includes(type)) {
    return NextResponse.json(
      { error: "Invalid report type" },
      { status: 400 }
    );
  }
```

**Step 2: Update PATCH validation in admin route**

In `src/app/api/reports/[id]/route.ts`, replace line 54:

```typescript
  if (body.type && ["armed_confrontation", "road_blockade", "cartel_activity", "building_fire", "looting", "general_danger", "criminal_activity"].includes(body.type)) {
```

**Step 3: Type-check**

Run: `npx tsc --noEmit`

Expected: PASS (no type errors)

**Step 4: Commit**

```bash
git add src/app/api/reports/route.ts src/app/api/reports/\[id\]/route.ts
git commit -m "feat: add new report types to API validation"
```

---

### Task 3: Report marker component

**Files:**
- Modify: `src/components/report-marker.tsx:13-25`

**Step 1: Add new entries to emojiMap and colorMap**

In `src/components/report-marker.tsx`, replace the `emojiMap` and `colorMap` objects:

```typescript
const emojiMap: Record<string, string> = {
  armed_confrontation: "💥",
  road_blockade: "🚧",
  cartel_activity: "🔫",
  building_fire: "🔥",
  looting: "🚨",
  general_danger: "⚠️",
  criminal_activity: "👹",
};

const colorMap: Record<string, string> = {
  armed_confrontation: "#ef4444",
  road_blockade: "#f59e0b",
  cartel_activity: "#8b5cf6",
  building_fire: "#f97316",
  looting: "#ec4899",
  general_danger: "#64748b",
  criminal_activity: "#059669",
};
```

**Step 2: Type-check**

Run: `npx tsc --noEmit`

Expected: PASS

**Step 3: Commit**

```bash
git add src/components/report-marker.tsx
git commit -m "feat: add marker emoji and color for new report types"
```

---

### Task 4: Report popup component

**Files:**
- Modify: `src/components/report-popup.tsx:150-171`
- Modify: `src/components/report-popup.tsx:376-379`

**Step 1: Add new entries to typeConfig**

In `src/components/report-popup.tsx`, add after the `building_fire` entry in `typeConfig` (after line 171):

```typescript
    looting: {
      dot: "bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.4)]",
      title: "Rapiña",
      link: "text-pink-600 hover:text-pink-500",
    },
    general_danger: {
      dot: "bg-slate-500 shadow-[0_0_10px_rgba(100,116,139,0.4)]",
      title: "Peligro General",
      link: "text-slate-600 hover:text-slate-500",
    },
    criminal_activity: {
      dot: "bg-emerald-600 shadow-[0_0_10px_rgba(5,150,105,0.4)]",
      title: "Actividad Criminal",
      link: "text-emerald-600 hover:text-emerald-500",
    },
```

**Step 2: Add new options to admin edit dropdown**

In `src/components/report-popup.tsx`, add after the `building_fire` `<option>` (after line 379):

```tsx
                    <option value="looting">Rapiña</option>
                    <option value="general_danger">Peligro General</option>
                    <option value="criminal_activity">Actividad Criminal</option>
```

**Step 3: Type-check**

Run: `npx tsc --noEmit`

Expected: PASS

**Step 4: Commit**

```bash
git add src/components/report-popup.tsx
git commit -m "feat: add new report types to popup and admin edit form"
```

---

### Task 5: Reports panel component

**Files:**
- Modify: `src/components/reports-panel.tsx:89-100`

**Step 1: Add new entries to borderMap and titleMap**

In `src/components/reports-panel.tsx`, replace both maps inside the `.map()` callback:

```typescript
                const borderMap: Record<string, string> = {
                  armed_confrontation: "border-l-red-500",
                  road_blockade: "border-l-amber-500",
                  cartel_activity: "border-l-violet-500",
                  building_fire: "border-l-orange-500",
                  looting: "border-l-pink-500",
                  general_danger: "border-l-slate-500",
                  criminal_activity: "border-l-emerald-600",
                };
                const titleMap: Record<string, string> = {
                  armed_confrontation: "Balacera",
                  road_blockade: "Narcobloqueo",
                  cartel_activity: "Cartel",
                  building_fire: "Quema",
                  looting: "Rapiña",
                  general_danger: "Peligro",
                  criminal_activity: "Criminal",
                };
```

**Step 2: Type-check**

Run: `npx tsc --noEmit`

Expected: PASS

**Step 3: Commit**

```bash
git add src/components/reports-panel.tsx
git commit -m "feat: add new report types to reports panel"
```

---

### Task 6: Map legend

**Files:**
- Modify: `src/components/map.tsx:251-276`

**Step 1: Add new legend entries**

In `src/components/map.tsx`, add after the "Quema" legend div (after line 275):

```tsx
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-pink-500 shadow-[0_0_6px_rgba(236,72,153,0.5)]" />
              <span className="font-mono text-xs text-zinc-600 uppercase">
                Rapiña
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500 shadow-[0_0_6px_rgba(100,116,139,0.5)]" />
              <span className="font-mono text-xs text-zinc-600 uppercase">
                Peligro
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shadow-[0_0_6px_rgba(5,150,105,0.5)]" />
              <span className="font-mono text-xs text-zinc-600 uppercase">
                Criminal
              </span>
            </div>
```

**Step 2: Type-check**

Run: `npx tsc --noEmit`

Expected: PASS

**Step 3: Commit**

```bash
git add src/components/map.tsx
git commit -m "feat: add new report types to map legend"
```

---

### Task 7: Report form

**Files:**
- Modify: `src/components/report-form.tsx:121-201`
- Modify: `src/components/report-form.tsx:236-245`

**Step 1: Add 3 new type buttons to the grid**

In `src/components/report-form.tsx`, after the "Quema" button (after line 200), add:

```tsx
              <button
                onClick={() => setType("looting")}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all min-h-[80px] active:scale-95 ${
                  type === "looting"
                    ? "border-pink-500 bg-pink-50 shadow-[0_0_20px_rgba(236,72,153,0.12)]"
                    : "border-zinc-200 bg-zinc-50 hover:border-zinc-300"
                }`}
              >
                <span className="text-3xl">🚨</span>
                <span
                  className={`font-display text-base font-bold tracking-wide uppercase ${
                    type === "looting"
                      ? "text-pink-600"
                      : "text-zinc-500"
                  }`}
                >
                  Rapiña
                </span>
              </button>

              <button
                onClick={() => setType("general_danger")}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all min-h-[80px] active:scale-95 ${
                  type === "general_danger"
                    ? "border-slate-500 bg-slate-50 shadow-[0_0_20px_rgba(100,116,139,0.12)]"
                    : "border-zinc-200 bg-zinc-50 hover:border-zinc-300"
                }`}
              >
                <span className="text-3xl">⚠️</span>
                <span
                  className={`font-display text-base font-bold tracking-wide uppercase ${
                    type === "general_danger"
                      ? "text-slate-600"
                      : "text-zinc-500"
                  }`}
                >
                  Peligro
                </span>
              </button>

              <button
                onClick={() => setType("criminal_activity")}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all min-h-[80px] active:scale-95 ${
                  type === "criminal_activity"
                    ? "border-emerald-600 bg-emerald-50 shadow-[0_0_20px_rgba(5,150,105,0.12)]"
                    : "border-zinc-200 bg-zinc-50 hover:border-zinc-300"
                }`}
              >
                <span className="text-3xl">👹</span>
                <span
                  className={`font-display text-base font-bold tracking-wide uppercase ${
                    type === "criminal_activity"
                      ? "text-emerald-600"
                      : "text-zinc-500"
                  }`}
                >
                  Criminal
                </span>
              </button>
```

**Step 2: Update the submit button color logic**

In `src/components/report-form.tsx`, replace the submit button className ternary chain (lines 236-245):

```tsx
            className={`w-full py-3.5 rounded-xl font-display font-bold text-base tracking-widest uppercase transition-all active:scale-[0.98] ${
              !type || submitting
                ? "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                : type === "armed_confrontation"
                  ? "bg-red-600 text-white shadow-[0_4px_20px_rgba(239,68,68,0.3)] hover:bg-red-500"
                  : type === "cartel_activity"
                    ? "bg-violet-600 text-white shadow-[0_4px_20px_rgba(139,92,246,0.3)] hover:bg-violet-500"
                    : type === "building_fire"
                      ? "bg-orange-500 text-white shadow-[0_4px_20px_rgba(249,115,22,0.3)] hover:bg-orange-400"
                      : type === "looting"
                        ? "bg-pink-500 text-white shadow-[0_4px_20px_rgba(236,72,153,0.3)] hover:bg-pink-400"
                        : type === "general_danger"
                          ? "bg-slate-500 text-white shadow-[0_4px_20px_rgba(100,116,139,0.3)] hover:bg-slate-400"
                          : type === "criminal_activity"
                            ? "bg-emerald-600 text-white shadow-[0_4px_20px_rgba(5,150,105,0.3)] hover:bg-emerald-500"
                            : "bg-amber-500 text-white shadow-[0_4px_20px_rgba(245,158,11,0.3)] hover:bg-amber-400"
            }`}
```

**Step 3: Type-check**

Run: `npx tsc --noEmit`

Expected: PASS

**Step 4: Commit**

```bash
git add src/components/report-form.tsx
git commit -m "feat: add new report type buttons to creation form"
```

---

### Task 8: Visual verification

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Verify the form**

Open the app, click on the map, confirm all 7 type buttons render correctly in the bottom sheet with correct emojis, colors, and labels.

**Step 3: Verify the legend**

Check the top-right legend shows all 7 types with correct colors and labels.

**Step 4: Create a test report for each new type**

Click the map, select each new type, submit. Confirm the marker appears with the correct emoji and color. Click the marker to confirm the popup shows the correct title and dot color.

**Step 5: Final type-check and build**

Run: `npx tsc --noEmit && npm run build`

Expected: Both pass with no errors.
