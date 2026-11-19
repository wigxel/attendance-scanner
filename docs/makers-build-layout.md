# /makers/build implementation diagram

## Component / page flow

```mermaid
flowchart TD
    A[app/makers/page.tsx] -->|renders section shell #build| B[components/makers/build.tsx<br/>BuildSection]
    C[app/makers/build/page.tsx] -->|renders full client page| D[components/makers/build.tsx<br/>BuildDetail]
    B -->|link| C
    D -->|reuses| E[components/makers/tribes.tsx<br/>TRIBES]
    D -->|placeholder mailto until batch F| F[mailto:business@inspace.ng]
```

## Grid anatomy (desktop)

```
┌──────────────┬─────────────────────────────────────────────────────────┐
│ For          │  Build with Inspace Makers.                             │
│ organisations│                                                         │
│              │  A build team of verified members delivers...         │
│ Capabilities │  [Hire a build team]                                    │
│ Engagement   │                                                         │
│ Partners     ├─────────────────────────────────────────────────────────┤
│ Questions    │  Named accountability │ A verified team │ Work, checked │
│              │  ...                  │ ...             │ ...           │
├──────────────┼─────────────────────────────────────────────────────────┤
│ Capabilities │  ● ML/AI              │ Models, agents...               │
│              │  ● Additive Mfg       │ Printed parts...                │
│              │  ● Web Dev            │ Websites and tools...           │
├──────────────┼─────────────────────────────────────────────────────────┤
│ Engagement   │ /01 Enquiry           │ Tell us what the problem is...  │
│              │ /02 Build Lead        │ A named builder takes...        │
│              │ /03 Scope             │ The work is written down...     │
│              │ /04 Delivery          │ The build team ships...         │
├──────────────┼─────────────────────────────────────────────────────────┤
│ Partners     │  Hubs, accelerators... contact business@inspace.ng      │
├──────────────┼─────────────────────────────────────────────────────────┤
│ Questions    │ Who works on...?      │ A build team drawn from...      │
│              │ What if...?           │ The Build Lead is...            │
│              │ ...                                                   │
├──────────────┼─────────────────────────────────────────────────────────┤
│ The ask      │  Bring us the problem. We will name the builder.        │
│              │  [Hire a build team]                                    │
└──────────────┴─────────────────────────────────────────────────────────┘
     16ch                 5 equal content fields (gap-x-8)
```

## Rules enforced

- One 6-track grid everywhere (`16ch` margin + 5 fields); every annotation, dot and `/0n` sits on the margin axis.
- Single hairline rules only (`border-t` per block + `divide-y` inside lists); no double borders.
- 4px typographic module / 8px rhythm — all spacing and leading values are multiples of 4.
- No fake numbers, no client names, no income promises.

## Image slot on landing #build

The landing `#build` section is a full-bleed poster: the photo fills the
viewport below the nav (`h-[calc(100vh-4rem)]`), with a black top-down
scrim and the H2, tag, sentence and CTA pinned on it. Replace
`/images/makers/build-with.svg` with a real photo of members at work
(≤120 KB, PRD rule).
