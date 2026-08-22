# Sauti Yako Web Platform — Design Exploration

## Three Directions Considered

### Theme Name: Zanzibar Civic Ledger
**Very Brief Intro:** A calm, modern public-service operations console inspired by Zanzibar’s coast, crafted for institutional trust rather than bureaucratic heaviness. Deep ink surfaces, sea-glass data accents, and strict information hierarchy make sensitive casework feel clear and protected.
**Probability:** 0.04

### Theme Name: Evidence Atelier
**Very Brief Intro:** A warm editorial workspace with archival paper tones, visible data marks, and restrained red alerts. It frames the platform as a casework studio for thoughtful practitioners.
**Probability:** 0.07

### Theme Name: Signal Room
**Very Brief Intro:** A high-contrast dark operations center with luminous status signals and investigative timelines. It feels immediate and technically capable, but risks being too intense for sensitive safeguarding work.
**Probability:** 0.02

## Chosen Direction: Zanzibar Civic Ledger

### Design Movement
**Contemporary civic modernism** with subtle East African coastal material cues. The interface balances clinical clarity with human care, using an asymmetrical left operational rail, generous breathing room, and analytical surfaces that never feel cold.

### Core Principles
1. **Safety is visible:** urgent information is surfaced without using alarming visual noise.
2. **Complexity is staged:** summary, queue, and case-detail information reveal progressively.
3. **Data earns its emphasis:** numbers, trends, and status changes use disciplined color and typography rather than decoration.
4. **Institutional, not bureaucratic:** the system looks accountable, current, and intentional.

### Color Philosophy
The foundation is **midnight navy** for authority, privacy, and system permanence. **Lagoon turquoise** carries active operations and user agency; **palm green** confirms safe resolution and completed follow-up; **academic gold** identifies intelligent review and aggregate insight; **coral red** is reserved for priority and safeguarding escalation. Surfaces stay warm white or fog-blue to keep extensive casework readable over long shifts.

### Layout Paradigm
The application follows a **command-river layout**: a fixed dark navigation rail anchors the system, while the content area flows in bands of operational priority. Dashboard pages avoid a generic centered-grid look by pairing a tall decision column with a stacked intelligence column, using full-width queues only where comparison is essential.

### Signature Elements
1. A compact **voice-shield mark** that recalls the Sauti Yako microphone emblem without visual clutter.
2. **Case pulse bars** that combine status, urgency, and age in one legible horizontal marker.
3. **Coastal contour lines** used sparingly in headers and empty states to connect data operations to Zanzibar without becoming decorative wallpaper.

### Interaction Philosophy
Actions are calm and confirmatory. Analysts can triage cases with obvious next steps, view progress without unnecessary modals, and see state changes through grounded microcopy. High-risk actions use clear confirmation language; low-risk navigation feels immediate.

### Animation
Use 120–220 ms transform-and-opacity transitions only. Queue rows lift subtly on hover, KPI values cross-fade when filters change, and the priority flag uses a single restrained opacity pulse. Respect reduced-motion preferences. No looping gradients, dramatic springs, or attention-seeking entrances.

### Typography System
**Manrope** is the analytical sans-serif for controls, tables, and body copy. **Fraunces** is used sparingly for high-level operational headlines and the case-detail narrative prompt, adding a human, editorial register to a data-intensive tool. Labels use uppercase Manrope with deliberate tracking; primary metrics use tabular numerals.

### Brand Essence
**Sauti Yako Case Intelligence is the coordinated safeguarding workspace for university teams that need to act early, follow through, and account for every report.**

**Personality:** Assured, humane, exacting.

### Brand Voice
Headlines are direct and operational; CTAs state the outcome rather than the action mechanism. Microcopy recognizes sensitive work without becoming sentimental.

> “Every report has a next responsible action.”

> “Review the evidence, assign the follow-up, preserve the record.”

### Wordmark & Logo
The web lockup pairs the Sauti Yako voice-shield symbol with a custom-cut `SAUTI YAKO` wordmark in weighty geometric uppercase. A small **SUZA safeguarding unit** affiliation line appears only in administrative contexts, never as a substitute for the primary mark.

### Signature Brand Color
**Lagoon Signal — #0F9FAF**. It is the unmistakable active-state color for Sauti Yako across dashboards, charts, filters, and progress markers.

## Style Decisions

- Use a light, fog-blue operational canvas paired with a full-height midnight navigation rail.
- Keep cards square-leaning with 14–18 px radii, soft shadows, and occasional colored top rules rather than ubiquitous rounded pills.
- Use real dashboard interaction states with clear labels; do not include fabricated testimonials, ratings, or customer reviews.
- Initial screens will operate on clearly labeled demonstration workspace data until the Django API base URL and web authentication deployment target are configured.
- Every authenticated web view uses the full-height midnight command rail with the Sauti Yako voice-shield mark, wordmark, and Lagoon Signal active-route treatment.
- The Sauti Yako case pulse is a horizontal operational marker combining urgency, workflow stage, and case age; it appears in every triage-centric queue.
- Coastal contour linework appears only on command, reporting, and governance intelligence surfaces; it is never used as general wallpaper.
- Login and unauthenticated entry use a secure-threshold composition: the midnight civic atmosphere and calm operational panel both carry Sauti Yako’s visual language.
- Lagoon Signal (#0F9FAF) is the clear sign of active choice, secure continuation, and entry into a protected workspace; midnight navy remains the authority field.
- The entry lockup scales the voice-shield symbol and weighty uppercase wordmark deliberately, so the Sauti Yako identity remains recognisable at both small and large sizes.
