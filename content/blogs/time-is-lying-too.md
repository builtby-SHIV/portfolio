---
title: "Time is Lying Too"
date: "2026-09-14"
summary: "Understanding the problems that appear once machines have to coordinate the ordering of an event across a network in distributed systems."
tags: ["Distributed Systems", "Logical Clocks", "Vector Clocks"]
readTime: "6 min read"
mediumUrl: "PASTE_MEDIUM_URL_HERE"
---

Check part 1 of this blog [here](/blogs/distributed-systems-foundations).


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

_Communication paradigms continues into another part._
