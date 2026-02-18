## 2025-05-22 - API Information Leakage via Error Messages
**Vulnerability:** API endpoints were returning raw `error.message` in JSON responses, which can leak internal implementation details (file paths, library versions, etc.).
**Learning:** Defaulting to generic error messages for the client while keeping detailed logs on the server is essential for minimizing the application's attack surface.
**Prevention:** Establish a project-wide standard for error handling in API handlers that never returns raw error objects to the client.

## 2025-05-22 - Unbounded Subscription Storage
**Vulnerability:** The `/api/subscribe` endpoint allowed an unlimited number of subscriptions to be added to a single Vercel Blob file, posing a risk of storage exhaustion and DoS.
**Learning:** Any endpoint that appends data to a persistent store must have an upper limit to prevent malicious or accidental resource exhaustion.
**Prevention:** Implement "ceilings" or limits on all data collection endpoints.
