# New Report Types Design

## Summary

Add three new report types to Jaliscazo: Rapiña (looting), Peligro General (general danger), and Actividad Criminal (criminal activity). These extend the existing four types with the same behavior — only display attributes differ.

## New Types

| Type | Enum value | Emoji | Color (Tailwind) | Hex | Short label | Long label |
|------|-----------|-------|-------------------|-----|-------------|------------|
| Rapiña | `looting` | 🚨 | pink-500 | #ec4899 | Rapiña | Rapiña |
| Peligro General | `general_danger` | ⚠️ | slate-500 | #64748b | Peligro | Peligro General |
| Actividad Criminal | `criminal_activity` | 👹 | emerald-600 | #059669 | Criminal | Actividad Criminal |

Existing type `cartel_activity` is kept unchanged.

## Files to Modify

1. `src/db/schema.ts` — Add 3 values to `reportTypeEnum`
2. `src/types/index.ts` — Extend `ReportType` union
3. `src/app/api/reports/route.ts` — Add to POST/GET validation
4. `src/app/api/reports/[id]/route.ts` — Add to PATCH admin validation
5. `src/components/report-form.tsx` — Add 3 type buttons, adjust grid layout
6. `src/components/report-marker.tsx` — Add to `emojiMap` and `colorMap`
7. `src/components/report-popup.tsx` — Add to `typeConfig` and admin dropdown
8. `src/components/reports-panel.tsx` — Add to `borderMap` and `titleMap`
9. `src/components/map.tsx` — Add to legend
10. Drizzle migration — `ALTER TYPE report_type ADD VALUE` for each new type

## Form Layout

With 7 types the current 2x2 grid needs adjustment. Use a responsive multi-row grid.

## No Behavior Changes

New types use identical voting, scoring, and expiration logic.
