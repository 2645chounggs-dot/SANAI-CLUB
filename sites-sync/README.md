# SANAI-CLUB Sites MCP cloud nutrition sync (source-only)

STATUS: This is a proposed adapter, NOT an active hosted Site. The current account has
no Sites skill or Sites project/build/publish tools. No cloud database or MCP server
is deployed, and no Android pairing has been completed. main remains unchanged.

## Direct ChatGPT tools to expose after a Site is provisioned
- add_food: validate meal and macros; verified session user; idempotent mutationId.
- list_food: filter by local diet date and meal; owner-only records.
- update_food: row ID + expectedRevision + partial fields; reject stale revisions.
- delete_food: row ID + expectedRevision; tombstone rather than silent erasure.
- begin_pairing: verified user starts a one-time 10-minute high-entropy code.

## Authentication requirements
- Derive the owner ONLY from a verified Sites MCP session; never trust model-supplied userId.
- Device claim endpoint exchanges pairing code for 256-bit random bearer token.
- Server stores only SHA-256 hash of the token; phone stores token in Android Keystore.
- Authenticate all device sync endpoints, use HTTPS and fixed allowed hostname.
- Apply rate limits, quotas and audit logs without secrets or food plaintext.
- Require a serializable transaction or atomic compare-and-swap in real Sites DB.

## Initial migration and ongoing sync
1. Keep localStorage key ironlog.v5.nutrition and exercise data intact.
2. Back up existing app JSON before connecting; do not uninstall app.
3. Pair device, then upload existing diet rows in batches (never overwrite remote IDs).
4. Download owner snapshot and merge by stable ID and server revision.
5. On concurrent edits show a conflict; never silently delete or overwrite local logs.
6. Verify add/edit/delete in ChatGPT and local app end-to-end before disabling old
   GitHub encrypted delivery bridge. Until verified, keep current production active.

## HTTP and Sites adapter contract (not deployed)
- POST /v1/devices/claim (one-time code, deviceId; returns device token once)
- POST /v1/devices/import (Bearer device token; up to 200 records per batch)
- GET /v1/devices/snapshot (Bearer device token; full items + seq)
- GET /v1/devices/changes?since=N (Bearer device token; revisioned events)
- POST /v1/devices/update or /delete (Bearer token; expectedRevision required)
- Storage interface: store.read(key) and atomic store.transact(key, updateFn).
- Core implementation: server/food-service.cjs
- Pure conflict-aware merge planner: client/merge.cjs

## Testing and cost status
- GitHub Actions validates business logic, tenant isolation, pairing, collision/replay,
  revision conflicts, initial import, deletions, and safe merge behavior.
- These are unit tests; real Sites auth, DB transactions, Android networking, and APK
  installation remain UNVERIFIED and require Sites hosting/tools and a device test.
- No additional OpenAI API or paid server is designed into this plan, but availability
  and limits of a Sites free hosting/DB tier must be verified in the actual account.
  No guarantee of perpetual zero operating costs.
