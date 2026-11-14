# ADR-0001: Record architecture decisions

- **Status:** Accepted
- **Date:** 2026-11-14
- **Deciders:** Team
- **Related:** [ADR index](README.md)

## Context and problem statement

Hackathon teams make fast decisions that later nobody can explain ("why MapLibre?", "why is the
data in the repo?"). Judges and future maintainers will ask. How do we keep a durable, cheap record?

## Decision outcome

**Chosen option:** keep lightweight MADR-style ADRs in `docs/adr/`, one decision per file, reviewed
via PR.

### Consequences

- 👍 Decisions and their trade-offs are visible to judges and to anyone continuing the project.
- 👍 Pitch Q&A answers ("why didn't you use Google Maps?") are already written.
- 👎 A few minutes of overhead per significant decision.
