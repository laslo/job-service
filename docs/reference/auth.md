# Authentication and authorization

Aligned with [`architecture.md`](../architecture.md) and roadmap Stage 7 in [`roadmap.md`](../roadmap.md). Formal decision: [ADR-0008](../adr/0008-mvp-authentication-with-opaque-api-tokens.md).

---

## MVP (ship fast)

- **No Google / OIDC / social login** on the MVP critical path.
- **Restricted MVP access** (~5 principals), **10 jobs** per principal by default; enforcement is **server-side** (gateway and/or job service), not UI-only.
- **Preferred mechanism:** short-lived or rotatable **API tokens** (bearer or header) plus **coarse rate limits** and quotas. Sessions are optional if everything stays first-party and cookie setup remains simple.

This keeps integration small while the product proves job flows.

---

## After MVP

- **Login with Google** and other IdPs (**OIDC / OAuth2**) when real multi-user accounts matter.
- When external clients appear, reuse the same **OpenAPI** surface documented in [`api-sdk.md`](./api-sdk.md); auth may evolve to **JWT + refresh**, **opaque sessions**, or IdP-issued tokens—decide per environment.

---

## Where enforcement lives

| Concern | Typical owner |
|---------|----------------|
| “Is this caller allowed to use the API at all?” | API gateway |
| “How many jobs can this principal create?” | Job service (source of truth) with gateway mirroring for fast reject |

---

## Historical comparison (pre-decision)

| Approach | MVP fit | Post-MVP |
|----------|---------|----------|
| **API keys / opaque tokens** | **Best** — minimal UX, easy `curl` | Narrow automation / machine clients |
| Session cookies | Good for first-party web only | Full web sessions |
| Bearer JWT | Fine if you already need stateless services | Mobile / SPAs |
| OIDC (Auth0, Keycloak, …) | **Deferred** | Real user accounts |

---

## Related docs

- [ADR-0008](../adr/0008-mvp-authentication-with-opaque-api-tokens.md) — MVP auth decision record.
- [`tech-stack.md`](./tech-stack.md) — MVP auth posture vs stack.
- [`api-sdk.md`](./api-sdk.md) — how clients attach tokens to generated API calls.
