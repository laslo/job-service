# Authentication and authorization

Aligned with [`architecture.md`](../architecture.md) and roadmap Stage 7 in [`roadmap.md`](../roadmap.md). Formal decision: [ADR-0008](../adr/0008-mvp-authentication-with-opaque-api-tokens.md).

---

## MVP (ship fast)

- **No Google / OIDC / social login** on the MVP critical path.
- **Restricted MVP access** (~5 principals), **10 jobs** per principal by default; enforcement is **server-side** (gateway and/or job service), not UI-only.
- **Mechanism (Stage 7):** **JWT (HS256)** sent as `Authorization: Bearer <token>`. The JWT `sub` is treated as the **principal id**.
  - Secret: `JOB_API_JWT_SECRET` (env).
  - No refresh tokens for MVP; rotate secrets/tokens manually.
  - Server enforces **quota (10 active jobs)** and a coarse **rate limit** on create-job.

This keeps integration small while the product proves job flows.

### Local token minting

For local development you can mint a compatible HS256 token with a `sub` claim:

```bash
node -e "import { SignJWT } from 'jose'; import { createSecretKey } from 'node:crypto'; const secret=process.env.JOB_API_JWT_SECRET; if(!secret) throw new Error('missing JOB_API_JWT_SECRET'); const key=createSecretKey(Buffer.from(secret,'utf8')); const jwt=await new SignJWT({}).setProtectedHeader({ alg:'HS256' }).setSubject('principal-1').setIssuedAt().setExpirationTime('7d').sign(key); console.log(jwt);"
```

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
