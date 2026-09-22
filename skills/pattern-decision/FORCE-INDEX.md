# Force Index

A forces-to-patterns index for the enumeration step. Walk it per force; do not stop at the first hit. Each entry: the force it addresses, candidate patterns with canonical names (catalog in parentheses), one line of selection guidance, and — where useful for review — the structural contract the implementation must satisfy.

## Atomicity between a local write and an external effect

| Pattern (catalog) | Selection guidance | Contract |
|---|---|---|
| Dual Write (problem, not solution) | Name it when you see two writes with no shared transaction; the trigger for the entries below | — |
| Transactional Outbox (Microservices Patterns; EIP: Message Channel + Store) | Default when one DB and one broker/transport are involved | Business change + outbox row in **one** transaction; a **relay** (poller or CDC) owns the send; delivery bookkeeping (status/attempts); cleanup gated on delivery |
| Change-Data-Capture direct (Debezium-style) | When row-shaped facts are acceptable and no extra table is wanted; couples consumers to your storage schema | CDC connector tails WAL/log; consumers tolerate row semantics |
| Event Sourcing (PoEAA/Fowler) | When the event log itself is the source of truth and audit/replay is a requirement — not merely a messaging need | All state changes recorded as events; projections rebuild state |
| Two-Phase Commit / XA | Only where both resources genuinely support it and availability loss is acceptable; most brokers do not support XA | Coordinated prepare/commit across both resources |
| Saga (orchestrated or choreographed) | Multi-step cross-service transactions via compensating actions; orchestration for visible flow, choreography for autonomy | Each step has a compensating action; orchestrator state survives crashes (choreography: events carry the flow) |

## Delivery guarantees and duplicate handling

| Pattern (catalog) | Selection guidance | Contract |
|---|---|---|
| At-least-once delivery (EIP) | The realistic guarantee across a relay; design for duplicates rather than chasing exactly-once | Duplicates can arrive; consumers must dedupe |
| Idempotent Consumer / Idempotent Receiver (EIP) | Mandatory companion to at-least-once; dedupe on a business key, not just a message ID | Processed-message bookkeeping keyed on a stable ID; reprocessing is a no-op |
| Guaranteed Delivery (EIP: persistent channel) | When an accepted message must survive broker/process failure | Persistent storage at the channel; send acknowledgment before discard |
| Dead Letter Channel (EIP) | Poison messages must not block the channel | Failed messages land in a DLQ with context; alerting on it |
| Claim Check (EIP) | Payload too large for the transport; store the blob, send the reference | Store payload externally; message carries only the reference |
| Competing Consumers (EIP) | Horizontal scale-out on one queue | Each message handled by exactly one consumer; ordering no longer guaranteed across consumers |

## Communication and coupling between contexts

| Pattern (catalog) | Selection guidance | Contract |
|---|---|---|
| Messaging vs Request-Reply (EIP) | Async messaging when temporal decoupling or load leveling matters; sync RPC when a caller genuinely needs the answer now | — |
| Publish-Subscribe (EIP) | One fact, several independent consumers | Consumers get their own subscription; producers do not know consumers |
| Point-to-Point Channel (EIP) | Exactly one consumer per message | — |
| Content-Based Router / Recipient List (EIP) | Route by payload content; recipient list for static fan-out | Routing rules live somewhere testable |
| Splitter / Aggregator (EIP); Scatter-Gather | One message in, many out; or fan-out to services and merge | Aggregator correlates partial responses; timeout policy explicit |
| Message Translator / Normalizer; Canonical Data Model (EIP) | Systems speaking different formats; translation at the boundary | Translation owned by an adapter, not the producer |
| Message Store / Message History (EIP) | Debugging and audit of message flows | — |
| Anti-Corruption Layer (DDD) | Integrating with a foreign/legacy model you do not control | Translation happens at the boundary; the foreign model never leaks inward |
| Published Language / Open Host Service (DDD) | Your API is the contract others integrate against | Versioned, documented contract |
| Shared Kernel (DDD) | Only with tight, same-team coupling; otherwise a coupling trap | Explicitly listed shared elements only |

## Read-side and query scalability

| Pattern (catalog) | Selection guidance | Contract |
|---|---|---|
| CQRS | When read and write shapes diverge strongly or read scaling is the pressure | Separate read/write models; read side eventually consistent — say so explicitly |
| Materialized View | Precomputed read shape fed by change events | Refresh mechanism defined; staleness bounded and accepted |

## Data access and domain structure (PoEAA)

| Pattern (catalog) | Selection guidance | Contract |
|---|---|---|
| Repository | Domain-oriented collection abstraction over persistence | No ORM/query language leaks through its interface |
| Unit of Work | Coordinating a set of changes into one transaction | Tracks touched objects; single commit point |
| Domain Model vs Table Module vs Transaction Script | Match to logic complexity; do not reach for Domain Model reflexively | — |
| Service Layer | Defining application operations independent of delivery mechanism | — |
| Gateway (PoEAA) | Wrapping an external system behind your own interface | Foreign types stay inside the gateway |

## Operational resilience

| Pattern (catalog) | Selection guidance | Contract |
|---|---|---|
| Circuit Breaker | Fail fast when a dependency is down instead of piling up latency | Open/half-open/closed states; recovery probe |
| Bulkhead | Isolate resource pools so one exhausted dependency does not sink the ship | Separate pools per dependency |
| Throttling / Backpressure | Protect the system from faster producers | Explicit admission or load-shedding policy |
| Retry with Budget (incl. exponential backoff, jitter) | Transient faults; a budget, not infinite retry | Bounded attempts; retries dedupe-aware (idempotency!) |
| Health Check (readiness/liveness) | Orchestrators need signal, not vibes | Endpoint reflects real dependency state |

## Structure (GoF) — load-bearing only

Admit these at interface-design time, never inside a wayfinder-level debate. Recognize structure over names; the contract is the check.

| Pattern | Contract (what must actually hold) |
|---|---|
| Strategy | Family of interchangeable algorithms behind one interface; selection composed in, not branched over (a `switch` inside a "Strategy" is a Strategy-shaped comment) |
| Decorator vs Adapter | Decorator shares the wrapped interface and adds behavior; Adapter converts between differing interfaces — distinguish before choosing |
| Observer / Publish-Subscribe | Subjects do not know observers; ordering/lifecycle of notifications is specified |
| Template Method | Base class owns the skeleton; overridable primitive operations; the template method is not overridable |
| Iterator | Traversal without exposing internal representation |
| Proxy | Same interface as the subject; controls access (lazy, remote, protective) |
| Facade | Simplified front door to a subsystem; does not hide the subsystem |
| Mediator | Colleagues know only the mediator, not each other |
| Chain of Responsibility | Handlers decide to pass on; order defined |
| Factory Method / Abstract Factory / Builder | Creation behind interfaces when construction is polymorphic or multi-step; do not reach for a factory when a constructor works |

## Canonical combinations

- Transactional Outbox + Idempotent Consumer (the default for DB→broker integration)
- CQRS + CDC-fed Materialized View
- Saga (orchestrated) + Outbox (commands and events ride reliable channels)
- Publish-Subscribe + Competing Consumers (fan-out with scale-out within each consumer group)
- Anti-Corruption Layer + Gateway (legacy integration)
