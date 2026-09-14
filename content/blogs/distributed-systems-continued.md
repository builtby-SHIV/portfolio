---
title: "Distributed Systems — Foundations (contd.)"
date: "2026-09-14"
summary: "PACELC theorem, logical clocks (Lamport and Vector Clocks), and a comparison of synchronous communication paradigms — REST vs gRPC."
tags: ["Distributed Systems", "PACELC", "Vector Clocks", "REST", "gRPC"]
readTime: "10 min read"
mediumUrl: "PASTE_MEDIUM_URL_HERE"
---

Check part 1 of this blog [here](/blogs/distributed-systems-foundations).

## 1.4 PACELC

CAP theorem says we have to choose between Availability and Consistency during a network partition but here's a question CAP fails to answer:

What happens during the other 99% of the time when the network is healthy? Does the system work perfectly without any trade-offs?

Seems too good to be true.

### Why does the "no partition" case still have a problem?

Imagine a distributed system with data replicas spread across the world in Mumbai, Singapore and Frankfurt. Let's say a write operation takes place in Mumbai — when do we notify the client it's done? Three options:

- Mumbai replica waits for Singapore and Frankfurt replicas to acknowledge the write operation, then tells the client that the operation succeeded. This guarantees strong consistency across all replicas. If you try to read the new value from any of the replicas, you get the same fresh value everywhere, but latency spikes here. This is also called **synchronous data replication**, where the leader/primary replica waits for an acknowledgement from all other follower replicas/nodes that the write operation has been completed on their end.
- Mumbai replica completes the write operation on its end, does not wait for other replicas, and notifies the client about the success of the operation. If the client tries to read from the other replicas/nodes it might receive stale data. It's fast for the client but may return stale data. This is also called **asynchronous data replication**, where the leader/primary replica does not wait for an acknowledgement from all other follower replicas/nodes that the write operation has been completed on their end, and notifies the user of success anyway.
- Mumbai replica completes the operation and notifies other replicas about the write operation but does not wait for all the replicas. Here we reach a middle ground between consistency and latency. The leader/primary node might wait for acknowledgement from the nearest replica/node but does not wait for all the replicas/nodes. This is a **hybrid form** of synchronous and asynchronous data replication.

Even with no partition, there's still trade-offs to choose from. This is the gap that PACELC fills. If there's any kind of Partition (**P**), then we choose between Availability (**A**) and Consistency (**C**). Else (**E**, meaning the network is fine), we choose between Latency (**L**) and Consistency (**C**).

### Grounding it with real systems

Systems land at different points on this diagram, and knowing where explains a lot about how they feel to use:

- **DynamoDB, Cassandra → PA/EL.** During a partition they favor availability. During normal operation they favor low latency over strict consistency. Makes sense — these were built for "always respond fast," e-commerce-style workloads where a slightly stale product page beats a spinning loader.
- **MongoDB (default config) → PA/EC.** Available during a partition, but consistent during normal times (waits for enough replica acknowledgment before confirming a write).
- **Traditional relational databases with synchronous replication → PC/EC.** Consistent no matter what — they'd rather refuse a write than risk returning stale or conflicting data. That's why they can feel "slower" or less forgiving under network stress.

---

## 1.5 Time and Ordering

An important question to answer in a distributed system is: when two events happen on two different machines, which one happened first?

Beginner instinct is to use timestamps and compare each timestamp. But a timestamp comes from each machine's own internal clock, which is synced via NTP ([How Does NTP Work? | Kevin Sookocheff](https://kevinsookocheff.com)). NTP sync is not perfect and may lead to two clocks drifting apart by milliseconds or more. So if Event X on Machine 1 is timestamped 10:00:00.001 and Event Y on Machine 2 is timestamped 10:00:00.000, was X really after Y — or is that just clock drift lying to you? If we started using these timestamps for conflict resolution — Last Write Wins — we might end up with a wrong write and lose real data.

Hence, for distributed systems we use a different kind of clock, one that does not measure seconds but causality.

### Lamport Clock

To neatly solve this problem we maintain a scalar, non-negative clock called the **Lamport Clock** for each process/machine. It always starts at 0 and increments based on three fundamental rules:

For any internal event (write operation) taking place, the system will increment its internal Lamport Clock by 1.

```
# event happens
time = time + 1;
```

Before sending out a message to other nodes/receivers, the system will increment its internal Lamport Clock by 1.

```
# event happens
time = time + 1;
send(message, time);
```

Whenever a process or a system receives a message about an event, the message will contain the Lamport timestamp from that process/system. The receiving end will then take the maximum of its own counter and the counter received, and increment it by 1.

```
(message, incoming_time) = receive();
time = max(incoming_time, time) + 1;
```

![Lamport Clock](https://miro.medium.com/v2/resize:fit:1100/format:webp/0*vPt57lTNvjj05U0D.png)

_Courtesy of GfG_

### Problems with Lamport Clock

A Lamport Clock is able to represent a happened-before relationship between two events. If event A's timestamp is less than event B's, it tells us that event A happened before B. But there's no way to detect if A caused B, or is merely causally related to B. They could be independent events that just happen to be ordered this way.

Two events having different timestamps make it impossible for us to deduce if they happened concurrently or one before the other. If two events have the same timestamp, they might be concurrent, but even if they have different timestamps (e.g., event A with timestamp 5 and event B with timestamp 6), you can't be sure they weren't concurrent either.

A Lamport Clock is a _logical_ clock. An event with a lower timestamp does not mean that it actually happened earlier in the real world.

For the algorithm to work, a lot of messages need to be shared between services, leading to network traffic. Each service needs to keep its logical clock up to date with every event taking place in every other service.

Failure of any one of the processes will halt the progress of the entire system, making the architecture unreliable.

### Vector Clocks

Vector Clocks are the answer to the gaps presented by Lamport Clocks.

Instead of a single counter, we have a collection of `[node, version]` pairs per data item per node. Each pair tells us how many times the data got updated at that specific node for it to reach its current state. Whenever a write happens on a data item, the node updates its own version in the Vector Clock. Given a process P<sub>i</sub> with vector v, the following rules are applied:

- Before executing an event, except the act of sending a message, the process P<sub>i</sub> must increment the version value `v[i]` for the local vector.
- Before receiving any message, which must have the sender's vector for that data item, loop through all the versions, take the maximum, and increment its own version by 1.

![Vector Clocks](https://miro.medium.com/v2/resize:fit:1100/format:webp/0*FtJkICCTvO5nzv-q.png)

Let's look at an example for a clear understanding:

Imagine 3 nodes, each owning its own slot in the array for a data item: `[a's slot, b's slot, c's slot]`.

Given two vectors V(X) and V(Y), if every slot of V(X) is less than or equal to the corresponding slot of V(Y) and at least one slot is strictly less — X happened before Y.

If every slot of V(Y) ≤ V(X) — Y happened before X.

If neither holds — X has a bigger slot somewhere and Y has a bigger slot somewhere — the two events are concurrent.

Three nodes starting as `[0, 0, 0]`.

1. A does a local event — increments own slot, `[1, 0, 0]`.
2. A sends a message to B attaching its vector clock `[1, 0, 0]`.
3. Meanwhile, completely independently, C does a local update and increments its own slot, `[0, 0, 1]`.
4. B receives A's message. B's vector clock is `[0, 0, 0]`, so it computes `max([0, 0, 0], [1, 0, 0])` and increments its own slot — `[1, 1, 0]`.
5. B sends a message to C attaching `[1, 1, 0]`.
6. C receives B's vector clock and computes `max([1, 1, 0], [0, 0, 1])`, then increments its own slot — `[1, 1, 2]`.

**Did A's local event 1 take place before event 6?**

Check every slot: 1 ≤ 1, 0 ≤ 1, 0 ≤ 2 — yes, every slot of A's vector is less than or equal to the corresponding slot of the final vector, and there's at least one strictly smaller slot. Hence there exists a causal relationship where event 1 happened before event 6.

**Is event 3 concurrent with event 1?**

1 ≤ 0 is false, 0 ≤ 1, 0 ≤ 1 — slot A is ahead in event 1's vector, slot C is ahead in event 3's vector. Neither vector dominates the other in every slot, hence the events are concurrent — there's no causal relationship between them.

There are caveats still persisting around here. No free lunch in distributed systems.

The vector clocks' guarantee — never lose causal information — is in deep tension with staying small. Because staying small requires forgetting something, which inherently breaks the concept of causal relationships.

> "How do we forget something that we're confident we no longer need?"

This is also a documented problem for Amazon's DynamoDB. It's a well-known real-world failure they explicitly had to design around. A single popular database key — a shopping cart, for instance — syncing across phones, tablets, PCs, and background sync jobs could accumulate hundreds of `[node, version]` pairs. Most of these syncs would be from devices and servers that are long gone and no longer write. Two very concrete costs follow:

- **Storage:** We're now storing more metadata (the vector) than the actual data (the value). A small cart holding two items might have a 200-entry vector clock just to track causality.
- **Network:** The same 200-entry vector clock needs to be shipped with every replication and write job, forever. 195 out of the 200 entries might be from nodes that have ceased to exist.

Existing solutions include:

- **Cap the Vector Clocks:** This is the cheapest fix, where we cap the vector at a max size of say, 10–20. When it starts to overflow, we start deleting the oldest entries — the ones with the oldest wall-clock timestamp entries are dropped. The reasoning is that a node which hasn't contributed in a long time is least likely to still be active and racing with new writes. Dynamo's own implementation follows this practice of truncation with recency bias, explicitly noting that it's trading accuracy for practicality. It's a bet: for inactive nodes unlikely to be relevant, losing their slots is a low-cost, low-risk error. It's not a clean but pragmatic solution, where we accept that we might misclassify some old conflicts as "happened before" when they were actually concurrent, in exchange for bounded size.
- **Dotted Vectors:** The classical implementation of Vector Clocks conflates what a node has _seen_ with what it has _written_. Dotted Version Vectors separate this — each version gets tagged with `(node, counter)`, i.e. who wrote this, and a summary vector `{node: counter, B: counter, C: counter}`, i.e. what's been merged and seen.

---

## 1.6 Communication Paradigm

### Synchronous Communication

#### REST

REST is not a technology but a set of design principles created by Roy Fielding in his 2000 PhD dissertation. He was trying to solve the problem of the web, where millions of independent clients and servers were evolving separately, without needing everyone to agree with each other in advance. He proposed that API designers should follow the same design principles.

- **Client — Server:** separate concerns; the client does not need to know how or where the data is stored, and the server does not need to know about the UI.
- **Statelessness:** the server does not keep client session state between requests. Each request contains the information needed to process it. This makes it easier to scale, because any server instance can handle any request.
- **Cacheability:** responses declare whether they can be cached or not using headers (`Cache-Control`). This helps intermediaries avoid re-fetching.
- **Uniform Interface:** everything is a resource, a noun (`/api/v1/users`), identified by a URI and manipulated using a set of methods (GET, POST, PUT, PATCH, DELETE), represented in standard formats — JSON — and discoverable through HATEOAS (Hypermedia As The Engine Of Application State).
- **Layered System:** you can put proxies, gateways, and caching in between manually.

Almost all the APIs ever built are never fully RESTful; they're all RESTish. That's because nobody implements HATEOAS. It's not really a failure, because the useful 80% of REST (cacheability, uniform methods, resources, statelessness) provides more value without hypermedia.

Imagine not a browser calling an API, but multiple microservices calling each other over a hundred times a day. Ask yourself: does whatever made REST great for the public web still make sense here? This is where REST starts to hurt.

- **No fixed contract:** Let's say ProductService changes a field, but OrderService won't notice until it starts seeing zero values in production. Pulling in OpenAPI or Swagger specs to compensate won't be enough, since that's just documentation. Nothing stops the server and the specs from drifting apart from each other.
- **Serialization cost:** An internal call pays the CPU cost of encoding a response into JSON, and again decoding it from JSON. At machine-to-machine scale, it costs real CPU cycles and adds latency.
- **No native streaming:** If a service wants a live feed of stock updates — not just one request-response — REST has no built-in solution for this. Developers tend to reach for WebSockets or long-polling, both of which live outside the REST model.

REST is great when you don't control both ends — browser, public APIs, third-party integrations — and want loose, human-readable, cacheable, debuggable contracts. When you need to control both ends, with strict contracts and blazingly fast speed, REST's flexibility becomes friction.

#### gRPC

Google had this exact problem, so they internally built something called Stubby and made it open-source in 2015 under the name gRPC. It was built to solve the pain points caused by REST. To do this it made two engineering bets.

**Bet 1 — Replace HTTP/1.1 with HTTP/2**

HTTP/2 uses a binary framing layer that isn't human-readable. It supports multiplexing — multiple independent streams over a single TCP connection — so there's no queuing behind a slow request and no head-of-line blocking caused by HTTP/1.1 pipelining (though it does not eliminate TCP-level head-of-line blocking). That means one connection can carry thousands of concurrent calls. It also compresses headers (HPACK), since the same headers are sent repeatedly. This directly answers connection overhead and head-of-line blocking at scale.

**Bet 2 — Replace JSON with Protocol Buffers (protobuf)**

Instead of sending JSON and hoping both sides agree on the shape, you make contracts mandatory and write a `.proto` file first, which is compiled using a compiler called `protoc`. The contract is no longer merely a suggestion documented in Swagger docs that can drift apart from reality. If ProductService changes a field, the code won't compile until OrderService has been notified of the change. The bug you'd otherwise catch in production is now caught at build time.

Protobuf's wire format is also binary and far more compact than JSON: no repeated field names in every response, no quote characters, no whitespace, and numbers are encoded efficiently. Smaller payloads, faster to parse. This removes the JSON serialization cost at scale that REST carries.

gRPC also gives more than a single request/response cycle. It has four call shapes:

- **Unary:** one request, one response — directly equivalent to REST.
- **Server Streaming:** one request, streamed responses from the server. Think of a service asking for "live stock updates."
- **Client Streaming:** multiple requests from the client, a single response from the server. Think of uploading a file in chunks, one at a time, with the server responding with a single ack at the end.
- **Bi-directional Streaming:** both sides stream independently at the same time. Think of a chat application, or two services negotiating with each other.

_Communication paradigm continues into another part._
