# ADR-0008: MVP authentication with opaque API tokens

## Status

Accepted

## Date

2026-04-11

## Context

The MVP must gate API usage without committing to full **OIDC / social login**, multiple IdPs, or complex session infrastructure before job flows are proven. Callers still need **server-enforced** quotas and abuse protection, not UI-only checks.

## Decision

For the **initial release window**:

- Authenticate API callers with **opaque API tokens** (bearer or header), optionally short-lived or rotatable.
- Enforce **coarse rate limits** and **per-principal job quotas** in the **API gateway** and/or **job service** (source of truth for job counts).
- **Defer** Google / OIDC / social login to **post-MVP** when multi-user accounts become a requirement.

Operational detail and enforcement matrix: [`../reference/auth.md`](../reference/auth.md).

## Consequences

### Positive

- Minimal integration surface; easy to test with `curl` and automation.
- Keeps the MVP path focused on job lifecycle and infrastructure.

### Negative

- Manual or scripted token issuance and rotation processes until IdP integration lands.
- Not a substitute for full identity lifecycle (recovery, federation, SCIM) when the product grows.

## Alternatives considered

- **OIDC on day one:** better end-user story; slower MVP and more moving parts.
- **Session cookies only:** fine for first-party web; weaker for non-browser clients without extra design.
