# HTTP error contract

Stable shape every endpoint returns on failure, valid for browser, curl, and Orval-generated clients alike. Designed to evolve forward (new fields are additive) without breaking existing consumers.

The shape is enforced by `apps/job-service/src/common/exception.filter.ts` and asserted on by tests in the same folder.

---

## Envelope

```json
{
  "statusCode": 400,
  "error": "validation_error",
  "message": "Request validation failed",
  "details": [
    { "path": "type", "constraint": "isString", "message": "type must be a string" }
  ]
}
```

| Field        | Type                | Description                                                                                                              |
| ------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `statusCode` | `integer`           | Mirrors the HTTP status code on the response line. Convenience field for clients that only inspect the body.             |
| `error`      | `string`            | Stable, machine-readable code; safe to switch on in client code. Renaming or removing one is a **breaking change**.      |
| `message`    | `string`            | Human-readable summary. Not localized; do not surface verbatim to end users without translation.                         |
| `details`    | `unknown` or absent | Optional structured payload (validation failures, conflict info, dependency cause). Shape is documented per error code. |

---

## Codes (current)

| HTTP | `error`                | When                                                                                                  |
| ---- | ---------------------- | ----------------------------------------------------------------------------------------------------- |
| 400  | `validation_error`     | Request body fails class-validator rules; `details` is an array of `{ path, constraint, message }`.   |
| 400  | `bad_request`          | Generic 400 (e.g. `ParseUUIDPipe` failure on `:id`).                                                  |
| 404  | `job_not_found`        | `GET /v1/jobs/:id` for an unknown id.                                                                 |
| 404  | `not_found`            | Generic 404 fallback (route not registered).                                                          |
| 503  | `service_unavailable`  | Readiness probe (`/ready`) fails — typically Postgres unreachable. `details.cause` carries the why.  |
| 500  | `internal_error`       | Unhandled exception. Server logs include the stack; the response body never does.                     |

Codes are listed in `apps/job-service/src/common/api-error.ts`. Add new ones there and document them in this table in the same change.

---

## Versioning posture

- New `error` codes can be introduced at any time.
- Existing codes never change semantics. If a meaning shifts, ship a new code and deprecate the old one over at least one release.
- `details` may grow new fields freely; clients must ignore unknown keys.

---

## Examples

### 400 — validation error

```bash
curl -i -X POST http://localhost:4000/v1/jobs \
  -H 'content-type: application/json' \
  -d '{ "type": "" }'
```

```http
HTTP/1.1 400 Bad Request
content-type: application/json

{
  "statusCode": 400,
  "error": "validation_error",
  "message": "Request validation failed",
  "details": [
    { "path": "type", "constraint": "minLength", "message": "type must be longer than or equal to 1 characters" },
    { "path": "type", "constraint": "matches", "message": "type must start with a letter and contain only letters, digits, dots, underscores or hyphens" }
  ]
}
```

### 404 — job not found

```bash
curl -i http://localhost:4000/v1/jobs/00000000-0000-4000-8000-000000000000
```

```http
HTTP/1.1 404 Not Found
content-type: application/json

{
  "statusCode": 404,
  "error": "job_not_found",
  "message": "Job 00000000-0000-4000-8000-000000000000 not found"
}
```

### 503 — readiness without database

```http
HTTP/1.1 503 Service Unavailable
content-type: application/json

{
  "statusCode": 503,
  "error": "service_unavailable",
  "message": "Database not reachable",
  "details": { "cause": "ECONNREFUSED 127.0.0.1:5432" }
}
```
