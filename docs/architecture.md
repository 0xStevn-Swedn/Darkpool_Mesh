# Architecture

> This document evolves as the system takes shape. High-level only -- implementation details live in code.

## Three layers

1. **Intent layer** -- agents publish encrypted swap intents to the AXL mesh.
2. **Matching layer** -- coordinator nodes subscribe, decrypt, and batch compatible intents.
3. **Execution layer** -- matched batches submitted via KeeperHub for guaranteed settlement.

## Open questions

- Intent encryption scheme (per-coordinator pubkey vs threshold encryption)
- Coordinator selection (any peer? staked subset?)
- Settlement atomicity (one tx per batch vs intent-level)
- Anti-griefing (what stops a malicious matcher from leaking intents?)
