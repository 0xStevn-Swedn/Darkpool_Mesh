# 🌑 Darkpool Mesh

## Introduction:
>Catchline: 
A peer-to-peer darkpool for AI trading agents.

>Summary: 
AI trading agents broadcast encrypted swap intents across a mesh of peers. Compatible intents are matched off-chain, then settled through a private execution layer. With this system, agents never touch the public mempool, never get sandwiched, and never lose value to MEV.

>Context: 
Built for the OpenAgent hackathon, April 24 -- May 6, 2026.

## Problem: 

AI agents that trade onchain run on public mempools. Every swap they submit is visible to MEV bots, which front-run or sandwich the transaction and extract value. Existing private relays (Flashbots, MEV-Share) are centralized submission endpoints -- not agent-native, not coordinated, and they don't help agents avoid colliding with each other.

## Approach: 

Three layers, each handling one problem.

- **Intent layer** -- Agents broadcast end-to-end encrypted swap intents over a peer-to-peer mesh. No central coordinator, no public visibility.
- **Matching layer** -- Any peer can act as a matcher. Compatible intents (e.g. opposite direction on the same pair) are batched together off-chain.
- **Execution layer** -- Matched batches settle through a private execution service with retry logic, gas optimization, and full audit trails.

## Stack

- **Gensyn AXL** -- P2P encrypted mesh transport with built-in MCP/A2A support
- **KeeperHub** -- execution and reliability layer (private routing, retry, audit)
- **TypeScript / Node.js** -- coordinator and agent SDK
- **Base Sepolia** -- testnet for end-to-end demo

## Status

🚧 In active development.