# Project documentation

This suite describes the current implementation of the Digital SingLit Bookshelf PoC. Its diagrams are explanatory views of the checked-in code; they do not describe proposed services or future architecture.

## Choose a starting point

| Audience | Start here | Then read |
| --- | --- | --- |
| Visitors and evaluators | [User guide](user-guide.md) | [Architecture](architecture.md) for system boundaries |
| Designers and product stakeholders | [User guide](user-guide.md) | [Data model and state](data-and-state.md) for exact behavior |
| Developers and maintainers | [Development guide](development.md) | [Architecture](architecture.md), then [Data model and state](data-and-state.md) |
| Deployment and support | [Deployment and operations](deployment.md) | [Architecture](architecture.md) |

## Documents

- [User guide](user-guide.md) — routes, roles, controls, workflows, accessibility provisions, and session behavior.
- [Architecture](architecture.md) — server/client boundaries, modules, WebGL rendering, sequences, performance measures, and external systems.
- [Data model and state](data-and-state.md) — PostgreSQL schema, TypeScript types, state ownership, capacities, and exact state machines.
- [Development guide](development.md) — local setup, repository map, safe change points, diagram workflow, and troubleshooting.
- [Deployment and operations](deployment.md) — Vercel/Next deployment, Neon configuration, failure modes, and current observability.

## Accuracy convention

Each technical section includes **Implementation anchors** pointing to the files and symbols that establish its claims. Each rendered diagram links to its canonical PlantUML source, whose leading comments repeat those evidence anchors.

When code and documentation disagree, the running implementation is authoritative. Update the prose, `.puml` source, and generated `.svg` together. Run:

```bash
npm run docs:diagrams
npm run build
```

The diagram command uses a pinned PlantUML Docker image. Readers only need the committed SVG files; Docker is required only to regenerate them.
