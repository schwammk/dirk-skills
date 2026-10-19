# Force Index

A problem-to-reference index, not an adoption checklist. Walk every applicable family, including
plausible rejected candidates and simpler alternatives; stop when the stated forces are covered,
not at the first familiar name. Use the linked primary sources to check a candidate's contract.
Presentation and notification articles below are Fowler's published drafts, not final catalog text.

Classify the result as a **named-pattern candidate**, **partial analogy**, **principle/local idiom**,
or **no named pattern needed**. Product intent remains a separate force. A pattern can explain two
alternatives without selecting between them.

## Presentation state, behavior, and validation findings

| Reference | Problem and required contract | Cost / limit | Simpler alternative and primary source |
| --- | --- | --- | --- |
| Presentation Model (also Application Model; MVVM is related vocabulary) | Presentation state and behavior independent of concrete controls; synchronization with the view has an explicit owner | Additional state/synchronization; does not select direct collaborators versus a readable port | Keep small local computed behavior when no separate model earns its keep. [Fowler](https://martinfowler.com/eaaDev/PresentationModel.html) |
| Supervising Controller | Simple view/model synchronization can use declarative binding; complex presentation and input response live in a controller | View behavior still needs some testing; not total widget-independent behavior | Keep existing bindings and extract only complex behavior. [Fowler](https://martinfowler.com/eaaDev/SupervisingPresenter.html) |
| Passive View | Controller owns presentation behavior **and view updates**; view has no model dependency | More explicit update wiring; passing computed markers into an Angular view is only a partial analogy, not full conformance | Supervising Controller or ordinary declarative bindings. [Fowler](https://martinfowler.com/eaaDev/PassiveScreen.html) |
| Notification | Return accumulated validation findings instead of aborting at the first expected validation problem | Caller must associate findings with fields/entities and decide how to present them; does not determine validation scope | A single typed result for one expected failure, or an exception for an exceptional failure. Not EIP Aggregator. [Fowler](https://martinfowler.com/eaaDev/Notification.html) |

## Editable state, identity, and stored results

| Classification / reference | Force and mechanism | Cost / limit | Simpler alternative and source |
| --- | --- | --- | --- |
| Local idiom: edit buffer | Keep pending edits distinct from accepted stored state; apply or discard them according to the user's Save/Cancel contract | Dirty state, re-add identity, deletion timing, partial success, and concurrent edits need explicit policies; a draft or Save button alone is not Unit of Work | Immediate effects only when the product promise permits them. Presentation models can hold uncommitted state: [Fowler](https://martinfowler.com/eaaDev/PresentationModel.html) |
| Principle: stable identity | Track the same entity despite a display-name change; define whether remove/re-add means the same entity | A stable ID is not Identity Map and does not decide whether files survive re-add | A name key is enough only if name really is immutable identity. For the stronger object-identity contract, see [Identity Map](https://martinfowler.com/eaaCatalog/identityMap.html) |
| Consistency requirement: read your writes | Adopt an accepted write result or refresh the authoritative read before exposing it as current | A cache/update/refresh policy must cover failure and stale responses; no automatic transaction, CQRS, or Repository claim | Explicit adopt/refresh operations with a clear owner. [Meyer: command/query distinction](https://se.inf.ethz.ch/~meyer/publications/online/eiffel/basic.html) distinguishes operations, not cache guarantees |
| Principle: cohesive operation / information hiding | One owner hides a multi-step protocol from callers; consider Facade or Service Layer only when their contracts fit | Grouping functions alone creates no atomicity, rollback, or history-preservation guarantee | A named function can be enough. [Parnas](https://wstomv.win.tue.nl/edu/2ip30/references/criteria_for_modularization.pdf) |
| Partial analogy: Lazy Load | Delaying work resembles lazy loading only when an incomplete object knows how/when to load its missing data | An explicit later validation request alone lacks that contract | An ordinary explicit operation. [Fowler](https://martinfowler.com/eaaCatalog/lazyLoad.html) |

Cancel semantics, whole-project/all-locale visibility, history retention, and what constitutes the
same re-added entity are product decisions. Settle them before choosing a mechanism. Buffered edits
and derived views do not by themselves establish Unit of Work or CQRS.

## Asynchronous relevance and small local runs

| Classification / reference | Force and mechanism | Cost / limit | Simpler alternative and primary source |
| --- | --- | --- | --- |
| Local idiom: current-intent / generation guard | Invalidate a token on selection changes and new requests; apply completions only if they still belong to current intent | Guard errors and loading cleanup as well as results; handle A→B→A. It does not cancel remote work | A small relevance check often suffices. [React's ignore-obsolete-response example](https://react.dev/learn/synchronizing-with-effects#fetching-data) illustrates the mechanism, not a recommendation to add React |
| Operator idiom: switchMap / supported cancellation | New outer input replaces the previous inner subscription; cancellation can avoid unnecessary work when the adapter supports it | Unsubscription is not universal remote rollback; cancellation alone does not establish every freshness invariant | Keep the guard; add cancellation when its actual resource-saving contract is useful. [RxJS](https://raw.githubusercontent.com/ReactiveX/rxjs/master/apps/rxjs.dev/content/guide/higher-order-observables.md), [Angular HTTP](https://angular.dev/guide/http/making-requests#http-observables) |
| Partial analogy: Correlation Identifier | A reply carries an identifier associating it with its request | Association alone does not say whether that request is still current; the relevance predicate supplies that policy | A local request token, with its current-intent check explained directly. [EIP](https://www.enterpriseintegrationpatterns.com/patterns/messaging/CorrelationIdentifier.html) |
| Resequencer (named pattern, different force) | Identify sequence order, buffer out-of-order messages, and release them in order when every required result must be processed | Buffering, gaps, and timeout policy; discarding obsolete previews does not satisfy this contract | A local generation guard for latest-intent relevance. [EIP](https://www.enterpriseintegrationpatterns.com/patterns/messaging/Resequencer.html) |
| Local execution policies: exclusive run, background run, staged publication | Decide admission, input snapshot, progress feedback, and result publication separately | Background editing needs reconciliation with changing inputs; a busy run can be adequate for a small workload | One explicit busy operation with appropriate feedback; ordinary state transitions, not a distributed messaging guarantee |

Whether a user may edit while a run is active is a product choice. Progress feedback does not imply
live publication, and live publication does not imply concurrent editing.

## Testing seams and substitute collaborators

| Reference / classification | Problem and contract | Cost / limit | Simpler alternative and primary source |
| --- | --- | --- | --- |
| Ports and Adapters / Hexagonal Architecture | Purpose-defined conversations isolate application behavior from concrete external adapters; alternate adapters can exercise the same conversation | Maintain the port and check substitutes against production semantics. An interface type or TypeScript `Pick` alone does not prove that isolation | Use real collaborators when their setup/coupling is acceptable; no mandatory six ports or extra framework. [Cockburn](https://alistair.cockburn.us/hexagonal-architecture) |
| Test Double taxonomy: Fake | A working implementation takes shortcuts unsuitable for production | State fidelity and maintenance cost; neither universal realism nor a requirement to use one in every test | Real collaborators or a small Stub. [Fowler's account of Meszaros](https://martinfowler.com/bliki/TestDouble.html) |
| Test Double taxonomy: Stub | Programmed answers supply collaborator inputs | Small setup, but limited state/lifecycle fidelity; verify the relevant production contract separately | A Fake or real collaborator when interactions across state transitions matter. [Fowler](https://martinfowler.com/bliki/TestDouble.html) |
| Test Double taxonomy: Mock | Expected interactions are specified and checked | Can couple tests to interaction order; choose when the interaction itself is the public contract | Assert observable behavior through the agreed interface. [Fowler](https://martinfowler.com/bliki/TestDouble.html) |

Real-collaborator tests versus substitutes is a test-design tradeoff, not a pattern contest. Explain
async settling, setup, and contract-drift costs on both sides. A smaller declared type preserves the
production signatures it selects; it does not automatically create a purpose-owned port.

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
| CQRS | When read and write models genuinely need different shapes or responsibilities; adds model/synchronization complexity, so ordinary CQS may suffice | Separate command and query models; choose the synchronization/consistency policy explicitly. Separate databases, messaging, event sourcing, and eventual consistency are **not inherent requirements**. [Fowler](https://martinfowler.com/bliki/CQRS.html), [Young, pp. 17–24](https://cqrs.files.wordpress.com/2010/11/cqrs_documents.pdf) |
| Materialized View | Precomputed read shape fed by change events | Refresh mechanism defined; staleness bounded and accepted |

## Data access and domain structure (PoEAA)

| Pattern (catalog) | Selection guidance | Contract |
|---|---|---|
| Repository | Domain-oriented collection abstraction over persistence; worthwhile when domain/data-mapping separation earns its cost | Collection/query-specification interface mediates mapping. A list cache or every I/O wrapper is not automatically a Repository; direct access or a Gateway can be simpler. [Fowler](https://martinfowler.com/eaaCatalog/repository.html) |
| Unit of Work | Track changes during a business transaction and coordinate persistence/concurrency; costs lifecycle and concurrency machinery | Tracks touched objects and coordinates writing at completion with an explicit concurrency policy. A Save button/draft list alone is insufficient; no automatic cross-resource atomicity. [Fowler](https://martinfowler.com/eaaCatalog/unitOfWork.html) |
| Identity Map | Avoid multiple loaded objects for the same persisted identity within a defined business-transaction scope; costs retention and lifecycle rules | One loaded object per identity in that scope. Stable IDs, summary lists, and deduped HTTP responses alone do not establish it. A simple key/map may suffice. [Fowler](https://martinfowler.com/eaaCatalog/identityMap.html) |
| Domain Model vs Table Module vs Transaction Script | Match to logic complexity; do not reach for Domain Model reflexively | — |
| Service Layer | Defining application operations independent of delivery mechanism; costs an application-operation abstraction | Coordinates application behavior/transactions and responses; not every class named Service. A cohesive function can suffice. [Fowler](https://martinfowler.com/eaaCatalog/serviceLayer.html) |
| Gateway (PoEAA) | Wrap a foreign resource behind a client-owned interface; costs translation/maintenance | Encapsulates access in the client's terms; can wrap a library, server, or child process. A direct call can suffice when its foreign contract is acceptable. [Fowler](https://martinfowler.com/articles/gateway-pattern.html) |

## Operational resilience

| Pattern (catalog) | Selection guidance | Contract |
|---|---|---|
| Circuit Breaker | Fail fast when a dependency is down instead of piling up latency | Open/half-open/closed states; recovery probe |
| Bulkhead | Isolate resource pools so one exhausted dependency does not sink the ship | Separate pools per dependency |
| Throttling / Backpressure | Protect the system from faster producers | Explicit admission or load-shedding policy |
| Retry with Budget (incl. exponential backoff, jitter) | Transient faults; a budget, not infinite retry | Bounded attempts; retries dedupe-aware (idempotency!) |
| Health Check (readiness/liveness) | Orchestrators need signal, not vibes | Endpoint reflects real dependency state |

## Structure (GoF) — load-bearing only

Use these at module/interface decisions when a force makes them load-bearing. A wider wayfinder
decision may need a protocol-owning seam, but not an unrelated construction-pattern debate.
Recognize structure over names; a small ordinary function remains a credible candidate.

| Pattern | Contract (what must actually hold) |
|---|---|
| Strategy | Family of interchangeable algorithms behind one interface; selection composed in, not branched over (a `switch` inside a "Strategy" is a Strategy-shaped comment) |
| Decorator vs Adapter | Decorator shares the wrapped interface and adds behavior; Adapter converts between differing interfaces — distinguish before choosing |
| Observer / Publish-Subscribe | Subjects do not know observers; ordering/lifecycle of notifications is specified |
| Template Method | Base class owns the skeleton; overridable primitive operations; the template method is not overridable |
| Iterator | Traversal without exposing internal representation |
| Proxy | Same interface as the subject; controls access (lazy, remote, protective) |
| Facade | A simplified higher-level interface hides a subsystem's access protocol; it need not prevent advanced callers using that subsystem directly. Costs an interface and coordination owner. A function can suffice; no inherent transaction, rollback, or history-preservation guarantee. [GoF](https://www.cs.unc.edu/~stotts/GOF/hires/pat4e.htm) |
| Mediator | An object encapsulates interactions among colleagues to reduce their explicit coupling. Costs a coordination hub; not every one-way wrapper is a Mediator. Direct calls or a Facade may suffice. [GoF](https://www.cs.unc.edu/~stotts/GOF/hires/pat5e.htm) |
| Chain of Responsibility | Handlers decide to pass on; order defined |
| Factory Method / Abstract Factory / Builder | Creation behind interfaces when construction is polymorphic or multi-step; do not reach for a factory when a constructor works |

## Canonical combinations

- Transactional Outbox + Idempotent Consumer (the default for DB→broker integration)
- CQRS + CDC-fed Materialized View
- Saga (orchestrated) + Outbox (commands and events ride reliable channels)
- Publish-Subscribe + Competing Consumers (fan-out with scale-out within each consumer group)
- Anti-Corruption Layer + Gateway (legacy integration)

## No named pattern needed

An administrative name or handoff order needs only a short reason and recommendation. A product
policy needs a clear behavioral comparison. Neither needs a catalog walk or ADR merely to fill a
template. Information hiding, deep modules, and functional-core/imperative-shell are useful design
principles/approaches, not GoF pattern names or evidence of conformance.
