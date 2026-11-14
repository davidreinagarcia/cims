<!-- summary: Project overview, quick start, team rules and the map of all docs. -->
# CIMS: Campus Interactive Map System

Interactive map of the Georgia Tech campus, built for the SGA Campus Solutions Hackathon.

> One map for everything on campus: buildings, rooms, food, support desks, makerspaces,
> transit, and the student organizations that make Georgia Tech what it is. It's also the place
> to report what's broken and find a room that's free.

**Live:** https://cims.queenalexandria.online (auto-updates from `main`). Every branch gets its own preview at `https://<branch>-cims.queenalexandria.online`; list: https://branches-cims.queenalexandria.online

**Status:** 🟡 Building · **Prompts:** *Smarter Campus Map* (primary) + *Campus Maintenance* +
*Improved Room Reservations* (integrated)

## Team

- David Reina (@davidreinagarcia)
- _Add your name here_

See [Team Roles & RACI](docs/06-team-raci.md).

## The questions we are answering

> *How can campus navigation make it easier to discover spaces, resources, and student organizations?*
>
> …and, on the same map: *How can students report and help track maintenance issues more efficiently?*
> and *How can campus room reservations become easier and more efficient?*

Campus information lives in separate systems, and wayfinding fails at the last step, inside the
building. Reporting an issue means guessing between Facilities and IT, and booking a room means
checking several systems. Full context: [Problem Statement](docs/01-problem-statement.md).

## What we're building

| Outside (campus map)                                    | Inside (building view)                               |
|---------------------------------------------------------|------------------------------------------------------|
| 3D / isometric campus with clickable buildings          | Floor-by-floor directory from floor plans            |
| Toggleable layers: Food, Support, Makerspaces, Transit  | Rooms, study rooms, offices, restrooms, vending      |
| Building card: photo, hours, BuzzCard access            | Selected room highlighted on its floor               |
| Orgs & events pinned where they happen                  | **Report an issue** tied to the room / equipment     |
| Open issue reports with status, +1 instead of duplicate | **Free rooms now**, filtered by capacity & features  |

MVP scope and what's deliberately out: [MVP Definition](docs/02-mvp.md).

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
```

Requires Node 20+ (22 recommended).

## Where to put things

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the code layout. The fastest first contribution:
add a place to `src/data/places.json`.

## Working as a team

- `main` must always work and **deploys itself** as soon as a commit lands. Before merging, check
  that `npm run build` passes.
- Work on `feat/<name>` branches and open a PR. Run `git pull --rebase` before pushing.
- No secrets (API keys, tokens) in the repo. Use a local `.env` (already in `.gitignore`).

Full guide: [CONTRIBUTING.md](CONTRIBUTING.md). Task split and priorities: [docs/WORKPLAN.md](docs/WORKPLAN.md).
AI agents: [CLAUDE.md](CLAUDE.md).

## Documentation map

| Doc | What it answers |
|-----|-----------------|
| **[INDEX](INDEX.md)** | **Start here: generated map of every folder and file** |
| **[Merging to main](docs/MERGING-TO-MAIN.md)** | **Rules before anything reaches production** |
| [Function registry](docs/FUNCTIONS.md) | Every exported function/type: check before writing one |
| **[Design direction](docs/design/DESIGN-DIRECTION.md)** | **The "survey map" look: tokens, type, map styling** |
| [Maintenance system](docs/MAINTENANCE.md) | How indexes and docs stay current automatically |
| **[Work Plan](docs/WORKPLAN.md)** | **Who does what, priority checklist, how we (and our Claudes) avoid conflicts** |
| [Code architecture](docs/ARCHITECTURE.md) | Where code and data go in `src/` |
| [Project Charter](docs/00-project-charter.md) | Why, who, success criteria, constraints |
| [Problem Statement](docs/01-problem-statement.md) | The three SGA prompts, the problem, who has it, HMW |
| [MVP Definition](docs/02-mvp.md) | The smallest thing that proves the idea; MoSCoW scope |
| [PRD](docs/03-prd.md) | Personas, user stories, acceptance criteria |
| [System architecture](docs/04-architecture.md) | System design, data model, flows |
| [ADRs](docs/adr/README.md) | Every significant technical decision and why |
| [Roadmap & Milestones](docs/05-roadmap.md) | Phases, milestones, exit criteria |
| [Team Roles & RACI](docs/06-team-raci.md) | Who owns what |
| [Definition of Done](docs/07-definition-of-done.md) | When a story, feature, or release is "done" |
| [Risk Register](docs/08-risk-register.md) | What could sink us and the plan for each |
| [Contributing](CONTRIBUTING.md) | Branching, commits, PRs, code review, data |
| [Brainstorm (Miro)](docs/brainstorm/miro-board.md) | Raw board transcription |
| [Templates](templates/) | Meeting notes, weekly status |

## Deploy

See [deploy/README.md](deploy/README.md).

## License

_TBD_: confirm the hackathon's IP rules before choosing. Map data © OpenStreetMap contributors
(ODbL), attributed in the UI.
