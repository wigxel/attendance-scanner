# Inspace Makers Website PRD

> Source of truth for the /makers landing page. Owner keeps this file updated
> as sections are pasted/edited; sections 3–6 and forms are pending.

## Summary

The Inspace Makers landing page is one scrolling page with six sections that turns Nigerian builders into membership applicants and organisations into build-team enquiries. This PRD is the primary build document: it holds the structure, the requirements and the web copy.

Membership is free. Verification is the only gate, and the page says so in the hero: "Free to join. Verified to build." The page makes no promise of income.

## Goals and success metrics

The page has two jobs, in this order: membership applications from builders, then build-team enquiries from organisations.

### Goals

- Convert Nigerian builders into applicants who turn up to a first tribe meeting.
- Generate client, partner and sponsor enquiries for the Community.
- Show real work the community has produced, so both audiences can check the standard for themselves.
- Give each tribe a public face by introducing its Tribe Leader.
- Serve as a reference artefact. The page should pass the Web Dev tribe's own verification rubric.

## Audiences

Developers and makers are the primary audience and get the primary button everywhere. Clients are secondary and get their own section.

| Audience | Who they are | What they need to see | Action we want | Where the page serves them |
|---|---|---|---|---|
| Builders (primary) | Nigerian developers and makers in ML/AI, additive manufacturing, web, games or blockchain | What the community is, which tribe fits, how verification works, that joining is free, who leads their tribe | Apply to join | Hero, section 3, section 6 |
| Clients (secondary) | Fintechs, startups, SMEs, NGOs, agencies and institutions that need capability without hiring an agency | Verified talent, a named Build Lead, managed delivery, real work | Send a build-team enquiry | Hero, section 4, section 5 |
| Partners and sponsors | Hubs, accelerators, universities, grant makers | Proof of delivery and a route to talk | Send a partnership enquiry | Section 4, section 5 |
| Curious guests | Non-members invited by a member or leader | When the next meeting is and how to visit | Request a guest visit | Section 3 |

## Positioning, naming and voice

Inspace Makers is a community of verified Nigerian builders who ship real projects. The page must make that clear, and make clear what it is not, within the first two screens.

The identity the page sells: "I am a Nigerian builder who works to international standards, on local problems, and has a verified record to show for it."

### Messages for builders

- Free to join. Verified to build.
- Showing up gets you in the room. Being verified gets you on a build team.
- Your tier and your project credits are public and follow you.

### Messages for clients

- You get a verified, managed build team with a named Build Lead.
- You are buying a competence floor, not a freelancer lottery.
- Five capabilities: software, AI, additive manufacturing, games and blockchain.

### Claims the page must not make

- No promise of income, placement or a job. The words "paid", "earn" and "income" appear only in the developer FAQ answer in section 3.
- No member, project or client numbers that are not real on the day they are shown.
- No client names or logos without written permission.
- No "free" in a way that suggests low commitment. Pair it with verification every time.

### Naming rules

| Term | Use | Do not use |
|---|---|---|
| Inspace Makers | The brand, every time | Inspace, Inspace community, ISM |
| Tribe | One of the five disciplines | Track, chapter, guild |
| Tribe Leader | The role of each of the five leaders | Tribe head, lead |
| Community Leaders | The nav label and section title for the five Tribe Leaders | Team, staff, founders |
| Build team | The group that delivers a project | Squad, crew |
| Build Lead | The named person accountable to the client | Project manager |
| Builders | Members in general copy, so that makers are included | Devs, talent |

### Voice

Plain, direct, confident. Short sentences. British spelling. Sentence case for headings and buttons. No hype words: no "world-class", "revolutionary", "unlock", "empower" or "ecosystem". No exclamation marks.

## Page architecture

The page is one scroll: a sticky nav bar, five content sections and a footer. The four nav links map one-to-one to sections 3 to 6.

| # | Section | Anchor | Nav label | Audience | Job | Primary button |
|---|---|---|---|---|---|---|
| 1 | Nav bar | n/a | n/a | All | Navigation and a persistent way to apply | Apply to join |
| 2 | Hero | #top | Logo | All | State the identity and split the two audiences | Apply to join; Hire a build team |
| 3 | About the community and tribes | #tribes | Tribes | Builders | Explain what Inspace Makers is, help a builder pick a tribe, show the path to verification | Apply to join |
| 4 | Build with Inspace Makers | #build | Build with Inspace Makers | Clients, partners | Sell the verified build team | Hire a build team |
| 5 | Resources | #resources | Resources | Both | Prove the standard with real artefacts | View (per card) |
| 6 | Community Leaders | #leaders | Community Leaders | Builders | Put faces to the tribes | Join this tribe |
| Footer | n/a | n/a | n/a | All | Housekeeping and a last call to action | Apply to join; Hire a build team |

**Sub-blocks inside section 3, in order:** 3.1 What Inspace Makers is, 3.2 The five tribes, 3.3 How it works, 3.4 Verification tiers, 3.5 Membership, 3.6 Visit first, 3.7 Questions builders ask.

**Sub-blocks inside section 4, in order:** 4.1 The offer, 4.2 Five capabilities, 4.3 How an engagement runs, 4.4 Proof teaser, 4.5 Partners and sponsors, 4.6 Questions clients ask.

### Rules that apply to the whole page

- One H1, in the hero. Each numbered section opens with an H2. Sub-blocks use H3.
- Sections alternate between two background tones so a visitor can feel where one ends. Section 4 uses the strongest contrast, because it speaks to a different audience.
- Every section ends with a button, so a visitor never has to scroll back up to act.
- Forms open in a modal or inline panel. A visitor never leaves the page to apply or enquire.
- Section 5 and its nav link are hidden when fewer than three real artefacts are published. No other section is conditional.

<!-- Owner note: SECTION 4 DEVIATION — the landing #build holds a slim
teaser ("For organisations" + offer sentence + button), and
/makers/build carries sub-blocks 4.1–4.6 on a Müller-Brockmann-style
block grid (1 margin annotation field + 5 content fields, mono meta on
the shared margin axis, 4px/8px rhythm). Hero "Hire a build team" still
scrolls to #build first. Resolve the architecture table against this
deviation on the next PRD paste. -->

## Section 1: Nav bar

The nav bar is sticky, holds four anchor links in a fixed order, and keeps "Apply to join" visible at every scroll position.

### Copy

| Element | Copy | Behaviour |
|---|---|---|
| Logo | Inspace Makers | Scrolls to top |
| Link 1 | Tribes | Scrolls to #tribes |
| Link 2 | Build with Inspace Makers | Scrolls to #build |
| Link 3 | Resources | Scrolls to #resources |
| Link 4 | Community Leaders | Scrolls to #leaders |
| Button | Apply to join | Opens the membership application form |
| Mobile menu button (accessible name) | Menu | Opens the link list |
| Skip link | Skip to content | First focusable element; jumps past the nav |

### Behaviour

- Desktop (1024 px and up): logo left, four links centre, button right, on one line.
- Below 1024 px: logo left, "Apply to join" and the menu button right. The four links sit in a full-width drop-down panel in the same order.
- The link for the section in view is marked as current, visually and with `aria-current`.
- Anchor scrolling is smooth and offsets for the bar's height, so headings are never hidden under it. Respect the reduced-motion setting.
- The bar is 64 px tall at most on mobile and gains a bottom border once the page scrolls.
- If Resources is hidden, the bar shows three links. Do not leave a dead link.

### Acceptance criteria

- ☐ Links appear in the order Tribes, Build with Inspace Makers, Resources, Community Leaders at every width.
- ☐ Each link lands with its section heading fully visible below the bar.
- ☐ The menu opens, closes and traps focus correctly with keyboard only.
- ☐ "Apply to join" is visible without opening the menu at 360 px.

## Section 2: Hero

The hero states the identity in one headline and offers both audiences a button before any scrolling.

### Copy

| Element | Copy |
|---|---|
| Eyebrow | A community of verified Nigerian builders |
| Headline (H1) | Build to international standards, on Nigerian problems. |
| Description | Inspace Makers brings Nigerian developers and makers together in five tribes. We verify our work against a shared standard and ship real projects for the organisations that need them. |
| Primary button | Apply to join |
| Secondary button | Hire a build team |
| Line under the buttons | Free to join. Verified to build. |
| Tribe strip | ML/AI · Additive Manufacturing · Web Dev · Gaming · Blockchain |
| Meeting line (conditional) | Next general meeting: [day, date], [venue]. Request a guest visit |

### Behaviour

- "Apply to join" opens the membership application form with no tribe selected.
- "Hire a build team" scrolls to #build. It does not open the form, because a client needs the offer before the ask.
- Each name in the tribe strip scrolls to that tribe's card in section 3.
- The meeting line shows only when Admin has set a date. "Request a guest visit" opens the guest visit form.

### Design notes

- Headline, description and both buttons fit in the first screen at 360 by 640 px.
- The primary button is filled; the secondary is outlined. Both are at least 48 px tall and stack full-width on mobile, primary on top.
- No carousel, no autoplay video, no stock photography. If an image is used, it is a real photo of members at work, 120 KB or less, and the headline is the Largest Contentful Paint element, not the image.
- The five tribe colours make their first appearance in the tribe strip.

### Acceptance criteria

- ☐ Both buttons are visible without scrolling at 360 by 640 px.
- ☐ The headline is the only H1 on the page.
- ☐ The meeting line is absent, with no gap left behind, when no date is set.

<!-- SECTIONS 3–6, footer, forms: pending PRD continuation -->
