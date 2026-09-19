---
title: "We (machines), Need to Talk"
date: "2026-09-19"
summary: "From REST and gRPC to asynchronous messaging, the communication model you choose determines how your distributed system handles latency, failures, coupling, and scale."
tags: ["REST", "gRPC", "Kafka", "RabbitMQ"]
readTime: "22 min read"
mediumUrl: "PASTE_MEDIUM_URL_HERE"
---

Check the previous part of this blog [here](/blogs/time-is-lying-too).


## 1.6 Communication Paradigms

### Synchronous Communication

#### REST

REST is not a technology but a set of design principles created by Roy Fielding in his 2000 PhD dissertation. He was trying to solve the problem of the web where millions of independent clients and servers were evolving separately, without needing everyone to agree with each other in advance. He proposed that API designers should follow the same design principles.

- **Client — Server:** separate concerns, the client does not need to know about how or where the data is stored and the server does not need to know about the UI.
- **Statelessness:** the server does not keep client session state between requests. Each request contains the information needed to process it. This makes it easier to scale because any server instance can handle any request.
- **Cacheability:** responses declare whether they can be cached or not using headers (`Cache-Control`). This helps the intermediaries avoid unnecessary re-fetching.
- **Uniform Interface:** everything is a resource, a noun (`/api/v1/users`) identified by a URI and manipulated using a set of methods (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`), represented in standard formats — JSON — and discoverable through HATEOAS (Hypermedia As The Engine Of Application State).
- **Layered System:** you can put proxies, gateways and caches in between.

Almost all the APIs ever built are never fully RESTful, they're all RESTish. It's because nobody implements HATEOAS. It's not a failure because the useful 80% of REST (cacheability, uniform methods, resources, statelessness) provides more value without hypermedia.

Imagine instead of a browser calling an API, multiple microservices calling each other over a hundred times in a day. Ask yourself, does whatever made REST great for the public web still make sense here? This is where REST starts to hurt.

- **No fixed contract:** Let's say a ProductService might change a field but OrderService won't notice until it starts seeing zero values in production. Pulling up OpenAPI or Swagger specs to compensate won't be enough since that's just docs. Nothing's stopping the server and the specs from drifting apart from each other.
- **Serialization Cost:** An internal call pays the CPU cost of encoding a response into JSON and again decoding from JSON. At internal machine-to-machine scale, it costs real CPU cycles and adds latency.
- **No native streaming:** If a service wants a live feed of stock updates, not just one request-response, REST has no built-in solution for this. Developers tend to use WebSockets or Long-Polling, both of which live outside the REST model.

REST is great when you don't control both ends — browsers, public APIs, third-party integrations — and want loose, human-readable, cacheable, debuggable contracts. When you control both ends and need strict contracts and blazingly fast speed, REST's flexibility becomes friction.

#### gRPC

Google had this exact problem so they internally built something called Stubby and made it open-source in 2015 under the name gRPC. It was built to solve the pain points caused by REST. To do this it made two engineering bets.

**Bet 1 — Replace HTTP/1.1 with HTTP/2**

The new HTTP/2 uses a binary framing layer and multiplexing: multiple independent streams can share a single TCP connection, with no queuing behind a slow request and no head-of-line blocking caused by HTTP/1.1 pipelining, though it does not eliminate TCP-level head-of-line blocking.

One connection and thousands of concurrent calls.

It also compresses headers (HPACK) since the same headers are being sent repeatedly.

This directly answers connection overhead and head-of-line blocking at scale.

**Bet 2 — Replace JSON with Protocol Buffers (protobuf)**

Instead of sending over JSON — "hope you both agree on the shape" — you make contracts mandatory and write a `.proto` file first, which is compiled using a compiler, `protoc`. The contract is no longer merely a suggestion documented in Swagger docs, which can drift apart. If ProductService changes a field then the code won't compile until OrderService has been notified of the changes. The bug you'd catch in production will now be caught at build time.

Protobuf's wire format is also binary and far more compact than JSON. No repeated field names in every response, no quote characters, no whitespace, and numbers are encoded efficiently. Smaller payloads, faster to parse.

This removes the JSON serialization cost at scale caused by REST.

gRPC also gives more than a single request/response cycle. It has four call shapes:

- **Unary:** one request, one response, directly equivalent to REST.
- **Server Streaming:** one request and streamed responses by the server. Think about a service asking for "live stock updates".
- **Client Streaming:** multiple requests by the client and a single response by the server. Think uploading a file by dividing it into chunks and uploading each one of them, one at a time, and at the end, the server responds with an ack.
- **Bi-directional Streaming:** both sides stream independently at the same time. Think of a chat application or two services negotiating with each other.

### Asynchronous Communication

In synchronous communication the caller awaits. That's fine until we ask a harder question.

Picture OrderService handling checkout. To do this it must notify InventoryService to decrement the quantity, PaymentService to charge the card, ShippingService to schedule the shipment and EmailService to send an email to the customer regarding the order details. With synchronous communication the client has to wait for all these services to resolve before getting a confirmation message. On a bad day, let's say EmailService is down or loaded with a huge number of requests. So, even if we manage multiple requests concurrently, a number of those requests would be queued. Is it fair to keep the client hanging while EmailService is being resolved, or should the client be notified of the order confirmation and the email can reach the client later on? Solving this problem becomes the foundation of asynchronous communication in distributed systems.

The problem we're facing is called **temporal coupling**. For synchronous calls both sides need to be up, alive, healthy and fast at the exact same moment. Chain enough synchronous calls together and the system's reliability becomes the product of each service's uptime. This only gets worse with more services.

So the question that opens the whole topic is:

> "What if the caller didn't have to wait?"

#### Part 1 — Decoupling Time Itself

Think about how you would talk to your friend on a phone call: you both need to be present on the phone at the exact same moment, whereas when texting a peer, you write a message and hit send. The other person will see the text message on their own time. The conversation happens, it's just no longer temporally bounded.

Using the same analogy, what if OrderService, instead of waiting on EmailService to resolve, posts a note somewhere giving the details of the order and moves on? Some other process picks up the note and acts on it, in its own time.

You introduce a **broker** between the producer and the consumer. The job of the producer becomes to post the message to the broker and remain decoupled from the consumer's uptime, speed or existence. The last part matters because now we can deploy the producer irrespective of whether the consumer exists or not. Until the consumer shows up, the broker will hold onto all the messages.

This buys us three things:

- **Failure Isolation:** Downstream failure does not propagate upstream.
- **Load Leveling:** A sudden burst of 10,000 orders does not force EmailService to start 10,000 workers. Instead the broker absorbs the burst and its workers empty the queue at their own pace.
- **Independent scaling and deployment:** The EmailService team can deploy, scale and even change their service's code without seeking approval from other services.

![Producer, broker and consumer](https://miro.medium.com/v2/resize:fit:1100/format:webp/0*J3PoI14cXEoKqsHO.png)

_Courtesy of Luminous Men_

However, like all things, there are trade-offs to doing this as well, which include ordering, duplication and DID IT HAPPEN YET?

#### Part 2 — Message Brokers

A message broker is software that allows multiple different applications, services, and systems to communicate with one another even if they are written in different languages. This is done by translating messages between formal messaging protocols. Brokers can validate, store, route and deliver messages to their respective destinations. They allow senders to send messages to receivers without knowing where the receivers are, how many of them there are, or whether they are active or not. Message brokers allow two different patterns of sending messages from senders to receivers.

- **Point-to-Point:** This is the pattern used in messaging queues, allowing producers and consumers to have a one-on-one relationship.
- **Publish-Subscribe:** Often known as pub/sub, this pattern involves producers publishing messages to a particular topic, and each consumer then subscribing to the topics from which they want to receive messages.

![Point-to-point and publish-subscribe messaging patterns](https://miro.medium.com/v2/resize:fit:1100/format:webp/0*oxMy71gFl92EBxuF.png)

_Courtesy of Karan Pratap Singh_

##### Message Brokers vs Event Streaming

Event streaming offers only the pub/sub style of messaging, unlike message brokers which support both P2P and pub/sub. Event streaming is readily scalable but offers no guarantee of message delivery or of which consumers have received the messages.

Event streaming offers high scalability but few features that ensure fault tolerance like message brokers do. Also, event streaming has less message routing and queuing capability.

#### Part 3 — Messaging Queues

![Producer, queue and competing consumers](https://miro.medium.com/v2/resize:fit:1100/format:webp/1*XC94ujYRQWjGTMBKp_oIiw.png)

The simplest async pattern: OrderService (producer) writes a message onto a queue. A pool of EmailService processes (consumers) pull messages off that queue, process them and send an acknowledgement. This is called the **competing consumers** pattern — several workers race to grab work, and each message is handled by exactly one of them.

Why does a queue need acknowledgments? Ask yourself: a worker pulls a message, starts processing it, and then the machine it's running on crashes midway. Is that message gone forever? It'd better not be — that's a lost order. So the broker doesn't delete a message the instant it's handed out; it waits for an explicit **ack** (acknowledgment) from the worker saying "I finished, you can delete this now." If no ack arrives within a **visibility timeout**, the broker assumes the worker died and gives the message to someone else.

Now follow the cause-and-effect one step further: if a worker did finish processing, but crashed right before sending the ack, the broker will redeliver that message to a different worker — who now processes an order that was already processed. The message gets delivered twice. This is not a bug in the broker; it's an unavoidable consequence of "the network is not reliable" (remember the fallacies from last time). You cannot get a free lunch here — the practical guarantee almost every real broker gives you is **at-least-once delivery**, never exactly-once, not without extra work on your end.

So what's "the extra work"? **Idempotent consumers.** Give every message a unique ID, and have the consumer check "have I already processed this ID?" before doing real work.

What happens to a message that keeps failing no matter how many times it's redelivered — say, it has malformed data your worker can't parse? Left unchecked, it'll loop forever, retried indefinitely, clogging your queue. Some messages can never be processed successfully: a malformed payload, a reference to a deleted record, a bug in the consumer code that throws on certain inputs. Without intervention, these **poison messages** get retried forever, blocking the queue and consuming resources. The fix is a **Dead Letter Queue (DLQ)**: after N failed attempts, the broker automatically routes the message to a separate "graveyard" queue for a human (or an alerting system) to investigate, instead of letting it poison the main queue forever.

Real tools in this space: RabbitMQ, Amazon SQS, and similar. They all share this same core shape — one producer or many, a pool of competing consumers, ack-based delivery, and a DLQ for poison messages.

##### The DLQ Becomes a Graveyard

Messages flow to the DLQ during normal operation but nobody investigates. Months pass. The DLQ has 100,000 messages. Some represent real bugs that should have been fixed; some are genuine garbage that should be ignored; nobody can tell which are which.

The fix is operational discipline. Alert on DLQ depth. Have a runbook for triaging DLQ messages. Periodically reprocess them after fixes ship.

##### Retry Storm

A downstream dependency goes down. Consumers fail every message. Every message gets retried but it doesn't help because the dependency is still down. Retries pile up. When the dependency recovers, the queue has a massive retry backlog plus current traffic. The system thrashes.

The fix is **circuit breaking**: detect the downstream failure, stop retrying for some window, and route messages to the DLQ or pause consumption entirely. When the dependency recovers, drain the backlog at a controlled rate. This is one of the operational behaviors that distinguishes mature queue setups from naive ones.

##### Types of Messaging Queues

- **Priority Queue:** Messages in the queue are assigned priorities, and higher-priority messages are processed before lower-priority ones. Used when certain tasks need to be handled more urgently than others.
- **Dead Letter Queue (DLQ):** A special type of queue where messages that cannot be processed (due to errors or retries) are sent. Useful for troubleshooting and handling failed messages.
- **Task Queues:** Task queues receive tasks and their related data, run them, then deliver their results. They can support scheduling and can be used to run computationally intensive jobs in the background.

##### Advantages of Using Messaging

- Message queues make it possible to scale precisely where we need to. When workloads peak, multiple instances of our application can add all requests to the queue without the risk of collision.
- Message queues remove dependencies between components and significantly simplify the implementation of decoupled applications. Sometimes events need to be propagated to multiple services or components, but direct communication would be inefficient, so use a Pub/Sub message queue to broadcast events to all interested consumers, ensuring that all parts of the system receive the necessary updates.
- Message queues enable asynchronous communication, which means that the endpoints that are producing and consuming messages interact with the queue, not each other. Producers can add requests to the queue without waiting for them to be processed. Certain tasks, such as image processing or sending emails, are time-consuming and should not block the main application flow. Offload these tasks to a message queue and have background workers (consumers) process them asynchronously.
- Queues make our data persistent, and reduce the errors that happen when different parts of our system go offline.

#### Part 4 — Where "Plain" Message Queues Start to Hurt

If both InventoryService and EmailService need to know "order created," how does that work with a plain queue?

OrderService pushes the message to two different queues — one per interested consumer. Now ask: what happens when a third team spins up a FraudDetectionService that also wants to know about new orders? Someone has to go back into OrderService's code and add a third push. The producer now has to know the full list of everyone who cares about its events. That's a new, subtler form of coupling — not temporal this time, but **structural**. OrderService shouldn't need to know FraudDetectionService exists just to let it watch orders.

This is exactly the gap that pub/sub and event-driven architecture close.

#### Part 5 — Pub/Sub and the Event-Driven Mindset

The fix is a shift in what gets sent. Instead of the producer addressing a message to a specific consumer ("hey EmailService, send this email"), the producer publishes a **fact**: "an order was created." It doesn't address it to anyone. It doesn't know or care who's listening. Anyone who's interested subscribes to that stream of facts independently.

![Publisher-subscriber pattern](https://miro.medium.com/v2/resize:fit:1100/format:webp/0*Sj2RrtBRrIIbmYUr.png)

_Courtesy of Microsoft_

Once the events are published, adding FraudDetectionService will require zero changes to OrderService. This decoupling between producers and consumers lets them evolve independently, on their own timelines. Hence, event-driven architecture is the backbone of large microservice organisations, not because events are trendy, but because fewer teams need to talk to each other before shipping a change.

#### Part 6 — The Log-Based Model: Why Kafka Thinks Differently

A BullMQ-style pub-sub/fan-out approach is one thing, but understanding another powerful mental model is imperative if it solves a problem a queue cannot. What if a year from now, a new consumer joins and wants to see all the events that have happened from the beginning?

A traditional queue deletes the message once it's acknowledged — it's transient. Kafka works differently: think of it as an **append-only log** where messages ("records") stay for a configured period of time regardless of who's read them. Consumers don't take the message "off the log"; instead they bookmark it (an **offset**) — tracking how far they've read and moving the bookmark forward at their own pace.

This unlocks **replayability** — if FraudDetection joins, it can reset its offset to zero and replay all the events from the beginning. Doing the same with a queue that deletes on acknowledgement is impossible.

##### Kafka Internals

- **Producer:** Publishes messages to Kafka. For sending an email, the producer can send `{"email", "message"}` to Kafka.
- **Consumer:** Subscribes to Kafka topics and processes the feed of messages.
- **Broker:** Kafka server that stores and manages the topics.
- **Topic:** A category/feed name to which records are published. `sendEmail` can be a topic or `writeLocationToDB` can be a topic.

Let's take the analogy of a database:

- Broker = Database Server
- Topics = Tables

**Partition:** Each topic is divided into partitions for parallelism. A partition is similar to sharding in DB tables. On what basis do we partition? For that, we have to decide and code it ourselves. Suppose, for our `sendNotification` topic, we partition it based on location. North Indian data goes to Partition 1, and South Indian data goes to Partition 2.

**Consumer Groups:** When we make a consumer that subscribes to a topic, we have to assign a group to the consumer. Each consumer within a group does one type of processing from a subset of partitions. Ex: for video processing, as we saw earlier, we can have two consumer groups. One consumer group is for video transcoding, and the other consumer group is for caption generation.

Kafka performs a **rebalance** to distribute partitions among consumers. This rebalancing is done by Kafka on its own. We don't have to write code for it.

Let's consider a topic with four partitions and one consumer group with three consumers (maybe 3 different servers that are part of the same consumer group) subscribed to that topic.

```
Partitions: [Partition-1, Partition-2, Partition-3, Partition-4]

Consumers:  [Consumer-1, Consumer-2, Consumer-3]
```

In this scenario, Kafka rebalances on its own: Consumer-1 is assigned Partition-1, Consumer-3 is assigned Partition-4, and Partition-2 and Partition-3 go to Consumer-2.

![Kafka partitions rebalanced across three consumers](https://miro.medium.com/v2/resize:fit:1100/format:webp/1*VtmTetxM1aL0-VuNejDZTQ.png)

If the number of consumers subscribed to a topic in a group is greater than the number of partitions of that topic, then each consumer processes 1 partition, and the extra consumers don't do anything.

This means 1 partition of a topic can be processed by only 1 consumer of one group, but different consumers of different groups can process the same topic.

![Two consumer groups reading the same topic](https://miro.medium.com/v2/resize:fit:1100/format:webp/1*lgL8I1Al_nEB1HXjOd0S7Q.png)

If we want to horizontally scale our consumers, then we also have to create at least an equal number of partitions for the topic as there are consumers.

You can see that we have two different consumer groups, one for InventoryService and the other for EmailService. And you can also see that Kafka balanced all the partitions between the consumers of each group.

![InventoryService and EmailService consumer groups with balanced partitions](https://miro.medium.com/v2/resize:fit:1100/format:webp/1*GmeYp1ZfuxtyApFyP7MbYg.png)

##### The Trade-off: Partitioning

A single machine cannot hold arbitrary throughput, so Kafka splits a topic into partitions across multiple machines. Each partition is an independent ordered log spread across machines. Here's the catch: Kafka guarantees ordering **within a single partition, not across multiple partitions.**

There is no global ordering across partitions, and this is the consequence of parallelism. Multiple machines process multiple events concurrently, and maintaining a global order would require coordination between the machines. This would reduce the scalability we introduced partitioning for.

Since we want parallel processing for unrelated events and ordered processing for related events, consider an example. For Order #42, the events below must stay ordered:

```
Created → Paid → Shipped → Delivered
```

But Order #42 doesn't necessarily need to wait for Order #91. So ideally:

```
Order #42 ──→ Partition 0
Order #91 ──→ Partition 1
Order #17 ──→ Partition 2
```

Now these orders can be processed concurrently. But within each order:

```
Created → Paid → Shipped → Delivered
```

must remain ordered.

That's exactly what the **partition key** gives us. Use the order ID as the partition key. Kafka guarantees that all the messages with the same key land in the same partition, hence the same order.

#### Part 7 — The Hard Problems This Architecture Creates

Decoupling time doesn't remove complexity, it relocates it. Here's where it goes.

##### Delivery Guarantees, Precisely

Three levels exist:

- **At-most-once** — message might be lost, never duplicated (fire-and-forget, no acks). Rarely what you want.
- **At-least-once** — message is never lost, but might be delivered twice (the ack-timeout scenario from Part 3). This is what almost every real broker gives you by default.
- **"Exactly-once"** — heavily marketed, rarely actually true end-to-end. What brokers like Kafka really provide is exactly-once within their own pipeline under specific configurations; the moment your consumer does something external (writes to a database, calls another API), you're back to needing idempotency yourself. Treat "exactly-once" claims skeptically and design idempotent consumers regardless — it's the only guarantee you fully control.

##### The Dual-Write Problem

Say your consumer needs to both save something to its database and publish a new event about it. You call `db.save()`, then `broker.publish()`. What happens if the process crashes between those two calls? You've saved to the DB but never published — downstream services now silently never learn this happened. Do it in the other order and you can publish an event about something that then fails to save. There is no way to make these two independent systems (a database and a broker) commit atomically together by default.

The standard fix is the **Outbox pattern**: instead of publishing directly, write the event into an outbox table in the same database transaction as your actual data change — so both succeed or both fail together, atomically, because it's one database transaction. A separate lightweight relay process (or a Change-Data-Capture tool like Debezium reading the database's write-ahead log) then reads that outbox table and reliably publishes to the broker, retrying until it succeeds. You've turned a distributed atomicity problem into a local one.

![Outbox pattern](https://miro.medium.com/v2/resize:fit:1100/format:webp/0*x67lrDgxZXUKSRV1.png)

_Courtesy of Microservices.io_

##### Eventual Consistency

In the synchronous world, when OrderService's call to InventoryService returns `200 OK`, you know, right now, that stock was decremented. In the event-driven world, `OrderCreated` is published, and InventoryService decrements stock whenever it consumes that event — a few milliseconds later, usually, but under load, possibly longer. For a brief window, the system is in an inconsistent state: the order exists, but inventory hasn't caught up yet. This is called **eventual consistency**, and it is not a bug — it's the deliberate price paid for decoupling. The engineering skill is knowing which parts of your system can tolerate that window (most can) and which genuinely cannot (you generally don't want "is this payment authorized" to be eventually consistent — that stays synchronous).

##### Distributed Transactions Across Services — the Saga Pattern

Now the natural next question: if you can't have one ACID transaction spanning OrderService, PaymentService and InventoryService, how do you handle "charge the card, but if inventory turns out to be unavailable, refund it"? The answer is a **Saga**: a sequence of local transactions, each publishing an event that triggers the next step, with explicit compensating actions defined for rollback. `PaymentFailed` triggers `ReleaseInventory`. Nothing is atomic across the whole chain — instead, every step has a defined undo, and the system deliberately walks backward through completed steps if a later one fails. This can be coordinated by a central orchestrator, or emerge purely from services reacting to each other's events (choreography) — each has real trade-offs in debuggability versus coupling that are worth their own deep dive later.

Sagas are made up of three kinds of transactions:

- **Compensable transactions** can be undone or compensated for by other transactions with the opposite effect. If a step in the saga fails, compensating transactions undo the changes that the compensable transactions made.
- **Pivot transactions** serve as the point of no return in the saga. After a pivot transaction succeeds, compensable transactions are no longer relevant. All subsequent actions must be completed for the system to achieve a consistent final state. A pivot transaction can assume different roles, depending on the flow of the saga:
  - It can be an irreversible, noncompensable transaction that can't be undone or retried.
  - It can be the last undoable, or compensable, transaction.
  - It can be the first retryable operation in the saga.
- **Retryable transactions** follow the pivot transaction. Retryable transactions are idempotent and help ensure that the saga can reach its final state, even if temporary failures occur. They help the saga eventually achieve a consistent state.

There are two ways to coordinate a saga:

- **Choreography** coordinates sagas by applying publish-subscribe principles. Each microservice runs its own local transaction and publishes events to the message broker, which trigger local transactions in other microservices. It's good for simple workflows that have few services and don't need coordination logic. There's still a risk of cyclic dependency between saga participants because they have to consume each other's commands.

![Saga choreography](https://miro.medium.com/v2/resize:fit:786/format:webp/0*bDX7t01kW4gNUczm.png)

_Courtesy of Microsoft_

- **Orchestration:** a centralized controller, or orchestrator, handles all the transactions and tells the participants which operation to perform based on events. The orchestrator performs saga requests, stores and interprets the states of each task, and handles failure recovery by using compensating transactions. It avoids cyclic dependencies because the orchestrator manages the flow, but it introduces a point of failure because the orchestrator manages the complete workflow.

![Saga orchestration](https://miro.medium.com/v2/resize:fit:750/format:webp/0*JzERNPFzNpZ_28zl.png)

_Courtesy of Microsoft_

#### Part 8 — Some More Patterns

##### Competing Consumers

Multiple workers pull items from one destructive queue. Use this when you have multiple independent job items and want to parallelize their processing.

![Competing consumers pattern](https://miro.medium.com/v2/resize:fit:1100/format:webp/0*MN0eqfAuIKMaF0PO.png)

_Courtesy of Microsoft_

In the Competing Consumers pattern, one consumer receives each message for processing. In the Publisher-Subscriber pattern, all consumers receive every message.

It also leads to better scaling, as we can increase or decrease the number of consumers as the message volume fluctuates, but in a large-scale solution, high message volume can overwhelm a single message queue and turn it into a system bottleneck. In this situation, consider partitioning the messaging system to send messages from specific producers to a specific queue, or load balance to distribute messages across multiple message queues.

##### Push vs Pull

RabbitMQ pushes messages to a consumer as soon as they're available. Ask the obvious follow-up: what stops the broker from pushing messages faster than a slow consumer can actually handle them? RabbitMQ needs an explicit **prefetch count** (QoS setting) — "never push me more than N unacknowledged messages at once" — bolted on as a flow-control mechanism.

Kafka is pull-based: the consumer actively asks the broker, "give me messages starting at offset X," whenever it's ready for more. Notice what this buys you for free: **backpressure is automatic and structural**, not a bolted-on setting. A slow consumer simply pulls less often; nothing on the broker side needs a separate throttling mechanism to protect it. This single design choice is a big part of why Kafka tends to handle bursty, high-throughput workloads more gracefully than push-based brokers — the consumer, who actually knows its own capacity, is the one steering the pace.

![Push-based versus pull-based consumption](https://miro.medium.com/v2/resize:fit:1100/format:webp/0*Oi0xo1CAAcBg7cj7.png)

##### Scatter-Gather

One request needs input from several independent services, in parallel, before a final answer can be assembled — think "get a shipping quote" needing prices from three different carriers simultaneously. The requester publishes one request that fans out to multiple consumers (pub/sub), each replies independently (request-reply), and an aggregator collects replies, correlating them by a shared ID, until either all expected replies arrive or a timeout passes. Ask the hard operational question up front: what do you do if one carrier never replies? You must decide a timeout and a policy (proceed with partial results, or fail the whole request) — an unhandled scatter-gather will otherwise wait forever for a straggler that's never coming.

#### Part 9 — Deciding: Sync, Queue, or Event Log?

Ask this in order, every time:

1. **Does the caller need the answer to proceed right now?** ("Is this payment approved" before showing a confirmation screen) → stay synchronous (REST/gRPC). Don't reach for async just because it's fashionable.
2. **Is there exactly one thing that needs to do this specific piece of work, and do you mainly need reliability and load-leveling?** (resize an uploaded image, send a single email) → a queue (SQS, RabbitMQ) with competing consumers is simplest and enough.
3. **Do multiple, independent, possibly-not-yet-invented consumers need to react to "this happened," and might you need to replay history later?** → event log / pub-sub (Kafka, SNS+SQS fanout).

And the cost you're accepting every time you pick 2 or 3 over 1: you can no longer `curl` your way to understanding what happened. Debugging becomes "trace this order ID across five services' logs and a broker's internal state," and you now need real monitoring on **consumer lag** (how far behind is each consumer group from the head of the log) as a first-class production metric, not an afterthought.

---

_Stage 1 — Distributed Systems Foundations ends with this blog. This was an uphill battle which, if completed, will illuminate your understanding of distributed systems and how systems are actually glued together in large organizations. What follows is Stage 2 — a deep-dive into Microservices Architecture Fundamentals. More will be released soon. Stay tuned._