# AXL Configuration for Darkpool Mesh

Local setup for two AXL nodes -- Alice (listener) and Bob (dialer) -- used to develop and demo Darkpool Mesh's intent layer.

## Prerequisites

The AXL binary is a separate dependency. Clone and build it outside this repo:

```bash
cd ~/projects
git clone https://github.com/gensyn-ai/axl.git
cd axl
make build    # produces ./node
```

Requires Go 1.25+.

## Generate keys (one-time, per machine)

Keys are gitignored. Each machine generates its own.

```bash
cd /path/to/Darkpool_Mesh/infra/axl/alice
openssl genpkey -algorithm ed25519 -out private.pem

cd /path/to/Darkpool_Mesh/infra/axl/bob
openssl genpkey -algorithm ed25519 -out private.pem
```

## Run

Two terminals.

**Terminal 1 — Alice (listener):**
```bash
cd /path/to/Darkpool_Mesh/infra/axl/alice
~/projects/axl/node -config node-config.json
```

**Terminal 2 — Bob (dialer):**
```bash
cd /path/to/Darkpool_Mesh/infra/axl/bob
~/projects/axl/node -config node-config.json
```

## Ports

| Node  | Peer port | API port | TCP port |
|-------|-----------|----------|----------|
| Alice | 9001      | 9002     | 7000     |
| Bob   | (dialer)  | 9012     | 7010     |

## Verify connectivity

```bash
curl -s http://127.0.0.1:9002/topology | python3 -m json.tool
curl -s http://127.0.0.1:9012/topology | python3 -m json.tool
```

Both responses should list the other node in `peers`.

## Send a test message (Bob -> Alice)

```bash
ALICE_PUBKEY=$(curl -s http://127.0.0.1:9002/topology | python3 -c "import json,sys;print(json.load(sys.stdin)['our_public_key'])")

curl -v -X POST http://127.0.0.1:9012/send \
  -H "X-Destination-Peer-Id: $ALICE_PUBKEY" \
  --data-binary "Hello from Bob"

curl -v http://127.0.0.1:9002/recv
```

Expect `200 OK` on `/send` with `X-Sent-Bytes` header, then `200 OK` on `/recv` with body `Hello from Bob`.
