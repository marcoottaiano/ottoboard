# Story 6.4: Interactive BodyCanvas

Status: ready-for-dev

## Story

As a user,
I want to interact with a visual body map (SVG figure) to see measurement values for each body zone on hover,
So that I can quickly scan which areas have been measured and how they compare to the previous session.

## Acceptance Criteria

1. **Given** I view the BodyCanvas in the Body tab **When** I hover/tap a body zone **Then** a tooltip shows: current value, date of last measurement, and delta vs previous session

2. **Given** a zone has no data in the most recent session **When** I hover it **Then** tooltip shows "Nessun dato" and the zone renders in a muted/inactive color

3. **Given** I click the "Posteriore" toggle **When** the SVG switches **Then** posterior view shows relevant zones (subscapular, tricep, calf, posterior arm, etc.)

4. **Given** I use keyboard navigation **When** I tab through body zones **Then** each zone gets a visible focus ring and the tooltip activates on focus

## Tasks / Subtasks

- [ ] Create `BodyCanvas.tsx` in `src/components/fitness/` (AC: #1, #2, #3, #4)
  - [ ] SVG anterior view with clickable/hoverable path zones
  - [ ] SVG posterior view with relevant zones
  - [ ] Toggle button "Anteriore / Posteriore" to switch views
  - [ ] Zone hover → show tooltip with value + date + delta
  - [ ] Zone with no data → muted color (`text-neutral-600`)
  - [ ] Zone with data → colored by module color (`orange-400`)
  - [ ] Keyboard: `tabIndex={0}` + `onFocus` = onMouseEnter behavior on each zone
  - [ ] Visible focus ring on focused zone (`focus:outline-none focus:ring-2 focus:ring-orange-400`)
- [ ] Integrate `BodyCanvas` into `BodyMeasurementsTab.tsx`
  - [ ] Render canvas in a card alongside charts
  - [ ] Pass latest 2 measurement sessions as props (to compute delta)

## Dev Notes

### Zone → Measurement Mapping

```
Anterior view:
  collo          → circ_neck
  petto          → circ_chest, skinfold_chest
  braccio-sx/dx  → circ_arm
  avambraccio    → circ_forearm
  addome         → circ_waist, skinfold_abdomen
  soprailiaca    → skinfold_suprailiac
  fianchi        → circ_hip
  coscia         → circ_thigh, skinfold_thigh
  polpaccio      → circ_calf

Posterior view:
  tricipite      → skinfold_tricep
  sottoscapolare → skinfold_subscapular
  ascellare      → skinfold_midaxillary
  (braccio post) → circ_arm (shared with anterior)
  (polpaccio post) → circ_calf (shared with anterior)
```

### SVG Implementation Pattern

- Use inline SVG React component — no external SVG files to import
- Each zone = `<path>` or `<ellipse>` with:
  ```tsx
  <path
    d="..."
    tabIndex={0}
    role="button"
    aria-label="Circonferenza addome"
    className={cn(
      'cursor-pointer transition-colors',
      hasData ? 'fill-orange-400/60 hover:fill-orange-400' : 'fill-neutral-700 hover:fill-neutral-600'
    )}
    onMouseEnter={() => setActiveZone('addome')}
    onMouseLeave={() => setActiveZone(null)}
    onFocus={() => setActiveZone('addome')}
    onBlur={() => setActiveZone(null)}
  />
  ```
- Keep SVG simple/stylized — not anatomically precise. A clean outline figure is fine
- Tooltip: use the existing `Tooltip` component from `src/components/ui/` if it exists, otherwise a simple absolute-positioned div
- Delta formatting: `+1.2 cm` (green) / `-0.8 cm` (depends on zone — lower is better for waist/fat, higher for arm/lean)

### Data Props

```typescript
interface BodyCanvasProps {
  latestSession: BodyMeasurement | null   // most recent
  previousSession: BodyMeasurement | null // second most recent
}
```

- Compute delta inside component: `latestSession.circ_waist - previousSession.circ_waist`
- When `latestSession` is null → show empty state "Nessuna misurazione"
- When `previousSession` is null → show value only, no delta

### Architecture Constraints

- Pure React + SVG — no external body-canvas or anatomy libraries
- No `position: absolute` with pixel offsets for layout elements (per CSS gotcha)
- Tooltip positioning: use mouse coords from `onMouseEnter` event OR fixed side panel
- Zone paths: hand-craft simple polygon paths representing body regions — keep them readable

### Project Structure Notes

- File: `src/components/fitness/BodyCanvas.tsx`
- Import `BodyMeasurement` type from Supabase generated types or local types

### References

- [Source: CLAUDE.md#Fase-9-BodyCanvas] — zone mapping, interaction spec
- [Source: architecture.md#Frontend-Architecture] — no external libs for covered functionality

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
