---
title: "Distributed Systems — Foundations"
date: "2026-08-31"
summary: "Why distributed systems exist, false assumptions about networks, the CAP theorem, and a comprehensive breakdown of consistency models."
tags: ["Distributed Systems", "Consistency Model", "CAP Theorem"]
readTime: "10 min read"
mediumUrl: "https://medium.com/@shiivv147/distributed-systems-day-1-3ba3c388363a"
---

## 1.0 Why distributed systems?

Imagine a single go server — one process one machine. A request comes in and a handler runs a function executing the request. Everything works smoothly, predictable and fast.

What happens when due to some reason the machine dies, not “fails” but dies. Every user on the planet is hit by this. Users don’t receive a slow response but rather nothing. So what’s the obvious fix? Buy a bigger machine. More RAM, more CPU cores, more processing power. Sounds like a fix. Still, the machine will fail someday. How long before we’ve to upgrade to a newer and bigger machine? The cost for a bigger machine doesn’t grow linearly. For double the computational power the cost is actually more than double. If money’s no issue still we’ve a single box responsible for everything.

The real solution now left is to distribute the responsibilities across multiple machines. That’s the entire reason distributed systems exist. Not because it’s trendy on X, LinkedIn or the tutorial said so — a single machine has a ceiling on its capacity, to eliminate SPOF(single point of failure), global latency and improve independent deployability(different teams ship their features independently) this fact becomes acceptable at some point.

Nonetheless, this solution has its own set of tradeoffs — earlier a handler ran and called a function which got executed in nanoseconds and always worked. Now we’ve placed a functionality on another machine which we’re accessing using a network call. A network call might drop the *message, fail, slow.* We’ve eliminated the problems of scale and fault tolerance but inherited a new set of problems: *what if the machine we’re trying to reach itself is down, it might return the same result twice, it might change order of delivery which we needed.* We’ve now traded simplicity of a single machine.


---

## 1.1 The network is not reliable

When calling a function inside a single process we never care to ask if it ran or not. It does. Every time.

Not the case with networks.

Split the function call across two services A and B. A calls B and waits for response.

1. B receives the request, processes it and returns the desired output.
2. B doesn’t receive the request — packet got lost on its way.
3. B receives the request, processes it and fails midway — did the process execute fully or not.
4. B receives the request, processes it and returns the desired output — packet got lost on its way to A.

From the perspective of A, case 2 and 4 are identical. A sent a request and got silent either way. In case 2 nothing happened and in case 4 something happened on B. Let’s say B deducted $50 from a user’s bank account, but A is unaware of this deduction, hence it has no way to notify the user of this change.

A network call doesn’t have 2 stages of — **failure and success.**

It has 3 stages of — **failure, success and unknown.**

Everything that we learn about distributed systems — **idempotency key, retries, sagas, circuit breakers,** all exist to solve the **unknown.**

Since the dawn of the internet there’ve been false assumptions engineers have kept about the network. These are:

1. The network is reliable (**its not**)
2. The network is secure (**hardly**)
3. Latency is zero (**sure, why not**)
4. Bandwidth is infinite (**its not**)
5. The topology never changes (**it does, constantly, at scale**)
6. There’s one administrator at control (**rarely is**)
7. Transport cost is zero (**serialization, un-serialization and data movement cost real time and money**)
8. The network is homogeneous (**it’s a mixture of hardware, protocols and providers**)

---

## 1.2 CAP Theorem

Take the “unknown” problem from above and scale it. Service A and B have become isolated and cannot talk to each other for some time — network partition. Maybe a data centre is down or firewall has been misconfigured. Happens all the time.

Both A and B have replicas of the same data. A request comes in on A’s side. We have exactly two options to choose from:

1. **Accept the writes** even though you can’t be sure if B has received the same writes. It keeps the system *available* but causes consistency issues. Later when the network partition resolves we need some kind of conflict resolution like CRDTs, OTs or Last Write Wins to maintain eventual consistency across all systems.
2. **Refuse the writes** will maintain *consistency* across all systems but trades *availability,* when the user needs it.

You cannot do both at the same time. That’s it. That’s the whole theorem.

![CAP Theorem](https://cdn-images-1.medium.com/max/568/0*7KImPAga_7R7tzPV.png)

**C**onsistency, **A**vailability and **P**artition.

A misconception about the theorem is the assumption to *choose one of the three CAP attributes permanently as an architecture-wide decision.* It’s worth being precise about this and why because **P**artitions aren’t something that we’re choosing. In distributed systems network partitions always happen whether we like it or not. What we can choose to do is how to handle the data during a partition. We can either choose to accept writes, even if it means having possible disagreements or do they refuse to answer until consistency can be guaranteed. That’s why real systems are describes as CP, AP not CA. We’ve make different choices for different kinds of data — consistency for bank accounts and availability for “likes” count on a social media post.

---

## 1.3 Consistency Models

### Eventual Consistency

![Eventual Consistency](https://cdn-images-1.medium.com/proxy/0*ZidDugTZhT6Yx8o6)

If no new writes come in, all replicas will *eventually* converge to get the same value but there’s no guarantee how long “eventually” takes and what you see in between(reading same data from multiple nodes simultaneously might return stale data).

- **Data consistency:** Lowest
- **App availability:** High to Highest
- **Latency:** Low
- **Throughput:** Highest

Real life examples include:

- Review or ratings of products in Amazon.
- Count of likes in Facebook.
- Views on YouTube videos.
- Stream of comments on Facebook live videos.
- Fetching how many Facebook friends / WhatsApp contacts are online.

![Eventual Consistency Cosmos DB](https://cdn-images-1.medium.com/max/746/0*CigUnubsJqaF8LcX.gif)

*Courtesy of [Microsoft](https://docs.microsoft.com/en-us/azure/cosmos-db/consistency-levels)*

---

### Consistent Prefix Read

A replica may be stale, but consistent prefix read will never expose writes out of order or skip ahead to a later write while missing an earlier one. If a data x has gone through 3 versions say A, B, and C respectively with C being the most updated version, **every replica receives these updates in the same order**.

- **Dirty Read / Stale Read is possible**.
- **Global ordering** guarantee applies for a given piece of data **across replicas**. Hence any unit of execution reads the operations in the same order.
- **No bound on staleness**. A replica can replicate the latest version of a data in 2 ms whereas another can do in 100 ms or 200 ms or any arbitrary time. This makes Consistent Prefix Read a weaker consistency guarantee.
- At time t1, if a replica serves version A of a data, at time t2 > t1, it’ll either serve version A or higher if a newer version of the data gets replicated but never any lesser one.

**Real Life Examples:**

- Sports apps which track score of soccer, cricket etc.
- Social media timelines (sorted by recency).

![Consistent Prefix Read Cosmos DB](https://cdn-images-1.medium.com/max/746/0*kOoL0kUH4axBH1sk.gif)

*Courtesy of [Microsoft](https://docs.microsoft.com/en-us/azure/cosmos-db/consistency-levels)*

---

### Session Guarantees

It’s an abstract concept that binds Reads and Writes together as a group. When we log in to Amazon a session is created internally which keeps track of your activities, browsing history, shopping cart etc. Each session is identified by its unique session id. The lifetime of a session can range from a few seconds to multiple days depending on use case. Consistency guarantee is provided for all operations inside a session so the user does not see any anomaly during that session. It is particularly useful when we want strong consistency for a particular session but not globally.

#### Read Your Writes

Many applications let the user submit some data and then view what they have submitted. This might be a record in a customer database, or a comment on a discussion thread, or something else of that sort. When new data is submitted, it must be sent to the leader, but when the user views the data, it can be read from a follower. This is especially appropriate if data is frequently viewed but only occasionally written.

With asynchronous replication, a problem arises, if the user views the data shortly after making a write, the new data may not yet have reached the replica. To the user, it looks as though the data they submitted was lost, so they will be understandably unhappy.

In this situation, we need *read-after-write consistency*, also known as *read-your-writes consistency*. This is a guarantee that if the user reloads the page, they will always see any updates they submitted themselves. It makes no promises about other users; other users’ updates may not be visible until some later time. However, it reassures the user that their own input has been saved correctly.

![Read Your Writes](https://cdn-images-1.medium.com/max/1024/1*4PrwMk482ktgajDFMDW-Ow.png)

*Courtesy of DDIA*

There are various possible techniques.

- When reading something that the user may have modified, read it from the leader or a synchronously updated follower; otherwise, read it from an asynchronously updated follower. This requires that you have some way of knowing whether something might have been modified, without querying it. For example, user profile information on a social network is normally editable only by the owner of the profile, not by anybody else. Thus, a simple rule is: always read the user’s own profile from the leader, and any other users’ profiles from a follower.
- If most things in the application are potentially editable by the user, that approach won’t be effective, as most things would have to be read from the leader (negating the benefit of read scaling). In that case, other criteria may be used to decide whether to read from the leader. For example, you could track the time of the last update and, for one minute after the last update, make all reads from the leader. You could also monitor the replication lag on followers and prevent queries on any follower that is more than one minute behind the leader.
- The client can remember the timestamp of its most recent write, and the system can ensure that the replica serving any reads for that user reflects updates at least until that timestamp. If a replica is not sufficiently up-to-date, either the read can be handled by another replica or the query can wait until the replica has caught up. The timestamp could be a *logical timestamp* (something that indicates ordering of writes, such as the log sequence number) or the actual system clock (in which case clock synchronization becomes critical).
- If your replicas are distributed across regions (for geographical proximity to users, for availability, or for durability), there is additional complexity. Any request that needs to be served by the leader must be routed to the region that contains the leader.

Another complication arises when the same user is accessing your service from multiple devices, such as a desktop web browser and a mobile app. In this case you may want to provide *cross-device* read-after-write consistency: if the user enters some information on one device and then views it on another device, they should see the information they just entered.

There are some additional issues to consider here:

- Approaches that require remembering the timestamp of the user’s last update become more difficult, because the code running on one device doesn’t know what updates have happened on the other device. This metadata will need to be centralized.
- If your replicas are distributed across multiple regions, there is no guarantee that connections from different devices will be routed to the same region. (For example, if the user’s desktop computer uses the home broadband connection and their mobile device uses the cellular data network, the devices’ network routes may be completely different.) If your approach requires reading from the leader, you may first need to route requests from all of a user’s devices to the same region.

#### Monotonic Reads

For example if user 2345 making the same query twice, first to a follower with little lag, then to a follower with greater lag. (This scenario is quite likely if the user refreshes a web page and each request is routed to a random server.) The first query returns a comment that was recently added by user 1234, but the second query doesn’t return anything because the lagging follower has not yet picked up that write. In effect, the second query observes the system state at an earlier point in time than the first query. This wouldn’t be so bad if the first query hadn’t returned anything, because user 2345 probably wouldn’t know that user 1234 had recently added a comment. However, it’s very confusing for user 2345 if they first see user 1234’s comment appear, then see it disappear again.

*Monotonic reads* provide a guarantee that this kind of anomaly does not happen. It’s a lesser guarantee than strong consistency, but a stronger guarantee than eventual consistency. When you read data, you may see an old value; monotonic reads mean only that if one user makes several reads in sequence, they will not see time go backward (i.e., they will not read older data after having previously read newer data).

One way of achieving monotonic reads is to make sure that each user always makes their reads from the same replica (different users can read from different replicas). For example, the replica can be chosen based on a hash of the user ID rather than randomly. However, if that replica fails, the user’s queries will need to be rerouted to another replica.

![Monotonic Reads](https://cdn-images-1.medium.com/max/874/1*qwBKvp4tNWCdrAeVxQWb8A.png)

*Courtesy of DDIA*

#### Monotonic Writes

- **Ordering Guarantee:** A unit of execution should **see its own successive updates on a particular variable / object in the order of their occurrence**. This guarantee **applies within the session**.
- **Propagation Guarantee:** Eventually, all other replicas should see the writes on the object in the same order. **This applies outside of the session**.
- It’s a weak consistency guarantee given the guarantee concerns about an unit of execution within a session only.
- If a Write W1 happens before another Write W2 in a session, still the unit of execution is unable to see W1 while executing W2, the session is said to be out of order.
- While an unit of execution is under MW guarantee within a session, other units of execution might not see the same updates on the same object at that point in time. **MW does not give any guarantee on propagation time**.
- Similarly, operations on the same object by other units of executions are not also guaranteed to show up during the current unit’s session.
- Consider editing an Wikipedia article. The system should guarantee that version n + 1 always replaces version n for updates performed by the same client, not the other way around. For other clients, these group of updates could be propagated at a later point in time in order. This can be guaranteed by Monotonic Write within a session.

![Monotonic Write Cosmos DB](https://cdn-images-1.medium.com/max/746/0*8XMEct7sgt0FMVk8.gif)

*Courtesy of [Microsoft](https://docs.microsoft.com/en-us/azure/cosmos-db/consistency-levels)*

- **Data consistency:** Moderate
- **App availability:** High
- **Latency:** Moderate
- **Throughput:** Moderate

**Real Life Examples:**

- Shopping cart. If you add some item to cart in amazon.in, those items won’t be visible in amazon.co.uk as that’s another session.
- Updating profile picture on social media like Facebook, Twitter. You can see your own updates but there is no guarantee others see it during initial few seconds at least.

---

### Causal Consistency

Causal consistency enforces ordering of **only related writes across units of executions**. Say, if an unit of execution reads a variable x and depending on its value, updates another variable y, we say, Write of y happens after (**causally dependent on**) Read of x. Causal consistency guarantees that **all units of execution observes** new value of y only after observing the related value of x (dependency).

- Only related writes are ordered in the order of their occurrence across units of execution. Unrelated writes can be placed in any order. Hence, **there is no notion of global ordering in a causally consistent system**.
- No real time constraints imposed.
- As mentioned, order in which variables are observed is more important than the real value observed at the time of operation.
- Different units of operation might observe different causally consistent sequences at the same time.
- **Causal order is transitive:** A happens before B, B happens before C means A happens before C.

![Causal Consistency](https://cdn-images-1.medium.com/max/1024/1*kR6ps8Y0ZSieyIrdyMASWg.png)

- **Data consistency:** Moderate
- **App availability:** High
- **Latency:** Moderate
- **Throughput:** Moderate

**Real Life Examples:**

- You post an important status on Facebook asking for some help. After sometime, you realize there is some mistake in the information provided, you go ahead and update the status. Now your online friends should get the update as soon as possible. They can receive the update at different time depending on how their feeds are formed. If eventual consistency is used, some of your friends may still see the older status with wrong info even after long time. But since the event of updating the status causes feed change of online friends, it can be considered as causal consistency.

---

### Bounded Staleness Consistency

This allows some degree of inconsistency in the data but guarantees that any read operation will not return data that is more than a certain number of versions or time intervals behind the latest write.

If you set the staleness to 5 minutes, any read operation will return data that is at most 5 minutes old. It means “staleness” refers to how much time can pass before the data you read is considered out-of-date. If you set it to 5 minutes, it means that when you perform a read operation (retrieve information from the database), the data you get will be, at most, 5 minutes old. In other words, you’re accepting that the information you read might be as recent as 5 minutes ago but not more recent than that. This allows a balance between having somewhat recent data and not putting too much load on the system by constantly requiring the absolute latest information.

User can configure the staleness threshold in couple of ways:

- **Time:** The Reads on a data item can be configured to be stale (lag behind the Writes) by **maximum specified time**. Example: If the configured stateless time is 5 seconds and current time is t = 11:00 AM, updates on the item done before (t — x) = 10:55 AM are to be considered stale. Updates performed within the last 5 seconds window is allowed.
- **No of versions / update operations:** For a given item, the reads might lag behind writes by maximum k updates or versions.
- Out of these two conditions, whatever is smaller / reached earlier gets applicable.
- Like Consistent Prefix Read, global ordering guarantee is there but coupled with configurable threshold as mentioned. So, Reads are consistent beyond the threshold.
- If you identify the threshold suitable for your use case, the performance could be better than strong consistency.
- Far more expensive than session, consistent prefix, eventual consistency etc.

![Bounded Staleness Cosmos DB](https://cdn-images-1.medium.com/max/746/0*eBzMyOF_6_SYDmQO.gif)

*Courtesy of [Microsoft](https://docs.microsoft.com/en-us/azure/cosmos-db/consistency-levels)*

- **Data consistency:** High
- **App availability:** Low
- **Latency:** High
- **Throughput:** Low

**Real Life Example:**

- Stock ticker applications.
- Weather tracking apps.
- Mostly, any status tracking apps should be bounded in staleness.
- May be, online gaming apps.

---

### Strong Consistency

Every read reflects the most recent write everywhere, as if there’s only a single copy of the data. It is the most expensive kind of consistency model since it requires coordination among all the replicas on all operations, leading towards higher latency and lower availability during partitions.

When a node receives write for a particular data item it then locks that item across multiple other replicas until the update propagates and all read operations are blocked on all the other replicas to prevent dirty or inconsistent reads. Locks are released once the item is updated across replicas.

![Strong Consistency Google Cloud](https://cdn-images-1.medium.com/max/625/0*mZaEB6AVMceKBI5p.png)

*Courtesy of [Google Cloud](https://docs.cloud.google.com/datastore/docs/articles/balancing-strong-and-eventual-consistency-with-google-cloud-datastore)*

#### Sequential Consistency

In a single threaded environment, a thread can invoke an object multiple times but the current invocation will occur only when the previous invocation has been completed. Hence, we got a chain of Invocation (I) and Response (R) messages with each ‘I’ being followed by ‘R’. This is easy to explain since no other threads are interfering the operations.

Consider three replicas — R1, R2, R3 — holding a copy of the same variable x, currently 0. Three different clients — P1, P2, P3 — are allowed to read and write x, each talking to whichever replica is nearest to them.

**What happens without any ordering rule?**

Say:

- P1 writes x = 1 (goes to R1 first)
- P2 writes x = 2 (goes to R2 first)

Now P3 reads from R1, and P1 reads from R3 (different replicas, because that’s just how distributed systems route requests). Without a rule, this is completely possible:

- P3 reads x from R1 → sees 1 (because R1 got P1's write first)
- P1 reads x from R3 → sees 2 (because R3 happened to get P2's write first)

So what did we just witness? P3 thinks “1 happened before 2.” P1 thinks “2 happened before 1.” Same two writes, opposite conclusions about their order — depending purely on *which replica you happened to ask.*

Why is that dangerous? Because now there’s no shared reality. If P1 and P3 later compare notes, they’ll argue about something that should have a single objective answer within the system.

**So how do we fix it at the read/write level?**

**Every replica must apply all writes in the same order, and every read — no matter which replica answers it — must reflect that same order.**

Concretely, this means two things have to hold:

1. **Global total order across all writes.** If the system decides x=1 happened before x=2, then R1, R2, and R3 must *all* eventually apply them in that order: first x=1, then x=2. No replica is allowed to apply them the other way around.
2. **Program order per process is preserved.** If P1 personally issues write x=1 and then write x=2 (its own two operations, back to back), the global order must place P1's own writes in that same sequence — you can't have the system deciding P1's second write happened before its first. That would break causality within a single client's own actions, which is even more absurd than disagreeing across clients.

![Sequential Consistency](https://cdn-images-1.medium.com/max/1024/1*W8d-QE2OhMkiEtHY4qmXRw.png)

#### Linearizability

Linearizability is an extension to sequential consistency guarantee but stricter and often referred to as strong consistency. Any sequential history can be treated as a linearizable history if operation across units of execution **maintain real time order, writes (including unrelated writes) made by different units of execution are ordered in accordance with real time and they tend to be instantaneous (a valid response follows each request).**

Consider the same example as in sequential consistency:

```text
I = Invocation, R = Response
thread A:         IA1----------RA1               IA2-----------RA2
thread B:          |      IB1---|---RB1    IB2----|----RB2      |
                   |       |    |    |      |     |     |       |
                   |       |    |    |      |     |     |       |
real-time order:  IA1     IB1  RA1  RB1    IB2   IA2   RB2     RA2
                 -------------------------------------------> time
```

Here, the following histories are linearizable:

```text
1. IA1 RA1 IB1 RB1 IB2 RB2 IA2 RA2
2. IB1 RB1 IA1 RA1 IB2 RB2 IA2 RA2
3. IB1 RB1 IA1 RA1 IA2 RA2 IB2 RB2
4. IA1 RA1 IB1 RB1 IA2 RA2 IB2 RB2
```

Note that (IA1, RA1), (IB1, RB1) **overlap meaning we actually don’t know their exact real time order. Linearizability acknowledges such overlaps: there is always a gap between making a request and getting response for that request — especially in distributed systems where probably the Write is replicated across geography during this time period**. Hence linearizability allows such operations in any order i.e; (IA1, RA1) can be ordered before (IB1, RB1) and vice versa. Similar logic applies for (IA2, RA2), (IB2, RB2). The group of operations [(IA1, RA1), (IB1, RB1)] fully precedes the group [(IA2, RA2), (IB2, RB2)] in terms of real time ordering. Hence any history where (IA2, RA2) or (IB2, RB2) comes before (IA1, RA1) or (IB1, RB1) is not linearizable by definition. The following history is not a valid linearizable history:

```text
5. IA1 RA1 IA2 RA2 IB1 RB1 IB2 RB2
```

**So, in short, if there is a variable V, a Write operation W(V = 3) happens at time t2, if you fetch the variable’s value at time t3 where t3 > t2, you must see the latest value of the variable, V = 3 irrespective of whichever unit of execution actually has written the value.**

The Read operations **must also follow real time order**, any unit of execution must see the **most recent value of a variable in real time** irrespective of whichever unit of execution has initiated the Write request for the concerned variable. It usually needs the read to go through a mechanism that guarantees “I am reading the latest globally-agreed value” — for example, routing all reads/writes through a leader, or using a quorum/consensus protocol (Raft, Paxos) to agree on ordering. But yes, if a Read operation by an unit of execution T1 for a variable x overlaps with a Write operation on the same variable x by another unit of execution T2, real time constraint could be discounted and older value of the variable could be fetched.

![Linearizability](https://cdn-images-1.medium.com/max/1024/1*KHDyDLsY5szrNPKdxniOcg.png)

#### Strict Consistency

Like linearizability, strict consistency is an extension to sequential consistency too but it is strictly coupled with real time ordering. We saw above that linearizability takes overlapped operations in a relaxed way, but strict consistency does not give that freedom. Overlapped operations also need to be ordered in strict real time order. **Strict consistency is an idealized model in which every read must immediately reflect the most recent write according to absolute real time, including the ordering of concurrent operations. Linearizability relaxes this for overlapping operations by allowing them to be ordered in either way, provided the resulting history is valid.**

![Strict Consistency Cosmos DB](https://cdn-images-1.medium.com/max/746/0*TMczj-sTuoTJNKAR.gif)

*Courtesy: [Microsoft](https://docs.microsoft.com/en-us/azure/cosmos-db/consistency-levels)*

- **Data consistency:** Highest
- **App availability:** Lowest
- **Latency:** High / Very High
- **Throughput:** Lowest

**Real Life Examples:**

- Financial systems executing order payments flow or billing process.
- E-Commerce Flash sale apps (inventory related apps).
- Ticket booking flow while confirming the ticket.
- Meeting scheduling kind of apps.

Different systems and distributed-systems literature use different consistency guarantees. Some, such as Cosmos DB, define a specific set of consistency levels. Others describe client-centric guarantees such as read-your-writes and monotonic reads, or formal models such as sequential consistency and linearizability.

---

## Conclusion

If you have come this far, congratulations!!! You have conquered a tough topic in distributed systems. Always remember distributed systems is all about making the right trade-offs as per the use case while being aware of all the options currently present.

![Conclusion](https://cdn-images-1.medium.com/proxy/0*1K504TMgGRb_3ckN.jpeg)

That’s it for this blog now. More on the way.

References:

1. DDIA by Martin Kleppmann
2. [Consistency Guarantees in Distributed Systems Explained Simply | by Kousik Nath | Medium](https://kousiknath.medium.com/consistency-guarantees-in-distributed-systems-explained-simply-720caa034116)
