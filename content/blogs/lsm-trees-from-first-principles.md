---
title: "LSM Trees — From First Principles"
date: "2026-08-02"
summary: "Why would anyone need to study a database storage engine? A deep dive into log-structured storage engines, memtables, SSTables, compaction strategies, and bloom filters."
tags: ["Database", "LSM Tree", "Storage Engine"]
readTime: "12 min read"
mediumUrl: "https://medium.com/@shiivv147/lsm-trees-from-first-principles-3dcd38d6ff76"
---

Why would anyone even need to study a database storage engine or an LSM Tree, was the first question I stumbled upon when I saw someone make their own storage engine on X or Twitter.

Back then, I did not have the answer for it. Now I do.

Because we want our applications or projects to work beautifully and serve their needs using the tools we currently possess. Now, no tool is wrong to use, but each has its use case and to understand which tool works where **IS** what we need so we don't end up like *Patrick* did:

![Patrick with hammer](https://miro.medium.com/v2/resize:fit:1200/format:webp/1*dfj4AXvB-_nI8hOnBeKkGg.jpeg)

Here we’ll be looking at a *log-structured* storage engine called **LSM** (Log-Structured Merge Trees) which uses an immutable file-storage system.

Before understanding LSM we shall do a mental exercise of creating our own database. The simplest database that can mimic LSM’s property of being *immutable*.

```javascript
get(...args) {
}

set(...args) {
}
```

The simplest database will have two APIs or functions: `get()` to get the data and `set()` to set the data.

To save the data we’ll store the key-value pair in a text-file separated by a comma (`,`) and each call to `set()` will append the data to the end of the file.

Before moving ahead can you guess the problem with these functions?

Nothing to sweat about if you cannot.

The time complexity for `set()` is **O(1)** because it's simply appending the key-value pair to the end of the file.

The time complexity for `get()` is **O(n)** because it's searching the whole file for the existence of a single key. When starting out with a small number of entries it won’t matter, but as `set()` appends more and more keys to the file, querying for a single key will become expensive.

Can you suggest something that could speed up reads?

If you said, **indexes** you hit the jackpot.

Indexes are another form of data structure used to optimize reads. It's a look-up table updated automatically. Many databases allow you to add or remove indexes as per your need.

The downside of using indexes is that writes become heavier, because now we have to update two places instead of one. Hence not every part of the database is supposed to be indexed.

Whenever we append to a file the OS knows the current file position. For example if the current position is at 37 bytes, then appending:

```text
age = 23
```

will happen exactly at byte 37.

Using the above fact and some DSA fundamentals we can arrive at an approach where we use a **hashmap** to store keys with their respective byte offsets. A hashmap has an O(1) time complexity for reads and when looking for a key we can use the hashmap to jump directly to the value.

![Hashmap byte offset lookup](https://miro.medium.com/v2/resize:fit:1400/format:webp/1*zminn-YMctVW802p8p3oqg.png)

One could argue that we can instead store the key value pair directly inside the hashmap instead of byte offsets. You’re right, until you have to store large blobs of data which can lead to RAM exhaustion.

Even with using indexes there are a lot of things to deal with:

1. We keep appending to a file and not clearing outdated entries. We might run out of disk space.
2. The index hashmap exists only in RAM. It's destroyed and built from scratch whenever we restart our database.
3. To build the hashmap from scratch we need to scan the whole file and find the byte offset for each key. This can become a hectic process if we have too many entries.
4. To solve the above problem we can use an on-disk hashmap. But an in-memory hashmap is difficult to maintain. There’s a lot of random access I/O and it's difficult to grow them when they become full. Also hash collisions are something to be taken care of.
5. Currently we cannot support range queries.

In practice, [actual databases don’t use hashmaps but sorted keys](https://www.evanjones.ca/ordered-vs-unordered-indexes.html).

So, much for building our own database.

---

## SSTable and Memtable

To reach a common ground between our approach and the one being used in enterprise, production-grade databases we use a hybrid approach of appending in a sorted manner.

Whenever a write comes in, we’ll append directly to an in-memory data structure called **memtable**, which will either be a trie, skip list, or a red-black tree. These data structures allow efficient and sorted reads and data can be inserted into them in any order.

When the size of the memtable grows above a certain threshold, we flush out the contents of the memtable onto an immutable file on the disk called **SSTable** (Sorted Strings Table). This SSTable file will contain the most recent segment of the database and will be placed alongside many other such SSTables storing older segments of the database. Each table will have its own index. While the new segment is being written out, the database can carry on appending to a new memtable instance and the old memtable’s memory will be freed when writing of the SSTable has been completed.

When trying to read the value of a key, we first try to find the key in the memtable and the most recent on-disk segment. If it’s not there, we keep looking in the next-older segment until we either find the key or reach the oldest segment. If the key does not appear in any of the segments, it does not exist in the database.

To ensure that the data in the memtable is not lost if the database crashes, the storage engine keeps a separate log on disk to which every write is immediately appended (Write-Ahead Log / WAL). This log is not sorted by key, because its only purpose is to restore the memtable after a crash. Every time the memtable gets written out to an SSTable, the corresponding part of the log can be discarded.

![Memtable and SSTable architecture](https://miro.medium.com/v2/resize:fit:2000/format:webp/1*kUp0WcabvF44TRj_2iT95w.png)

An SSTable stores key-value pairs in a sorted order in blocks of a few kilobytes and then stores the first key of each block in an index. This type of index is called a **sparse index**, since it only stores a small number of keys. This sparse index is made up of immutable B-Trees or tries and lives in a separate part of the table.

The reasons why we make an SSTable immutable are:

1. **Random writes are slow.** Disks or even SSDs are faster when you write things sequentially instead of jumping around and poking at random spots. Editing in-place means jumping to different places and tweaking a few bytes. That’s like asking someone to edit random words scattered across a 500-page book instead of letting them write a fresh page at the end.
2. **What if someone’s reading the file while you’re editing it?** What do they see? Half-old, half-new data? Garbage? To prevent that we need locks — *"nobody read this file, I'm still writing to it"*. Locks slow everything down and make things more complicated.

Having immutable segment files also simplifies crash recovery. If a crash happens while writing out the memtable or while merging segments, the database can just delete the unfinished SSTable and start afresh.

![Immutable segment files](https://miro.medium.com/v2/resize:fit:1400/format:webp/1*cBvStw775sFy_cZfuZ6K7g.png)

---

## Finding a Key in an SSTable

For instance, let’s say you’re looking for **king** inside the table, which doesn’t appear in the sparse index. Because of sorting, you know **king** must appear between the keys **kappa** and **omega**. You can seek the offset to **kappa** and look for **king**, if present. Scanning blocks of a few kilobytes can be done quickly.

We’ve been pushing a lot on this “sorted” approach. If sorting is so good why not always keep one long sorted file? Because SSTables are optimized for faster reads since writes are difficult. We simply cannot append to the end of the file without violating the whole approach of sorted keys. Reconstructing the whole table from scratch would be too expensive.

By continuing the above process we’ll run into multiple SSTables, some having live versions of the database, some with older and outdated versions. To solve this problem we do **merging and compaction**.

---

## Merging and Compaction

From time to time, we run a merging and compaction process in the background to combine segment files and discard overwritten or deleted values.

Merging segments works similarly to the **mergesort** algorithm. We start by reading the input files side by side, looking at the first key in each file, copy the lowest key (according to the sort order) to the output file, and repeat. If the same key appears in more than one input file, we keep only the more recent value. This produces a new merged segment file, also sorted by key, with one value per key, and it uses minimal memory because we can iterate over the SSTables one key at a time.

![SSTable Merge and Compaction](https://miro.medium.com/v2/resize:fit:1400/format:webp/1*TuRwaOXrz6-lKy0qG-u22A.png)

An important detail about LSMs is how compaction is done. Common choices are:

### 1. Size-tiered Compaction

Newer and smaller SSTables are merged into older and larger SSTables. The SSTables containing older data can get very large and merging them requires a lot of temporary disk space. However, this kind of compaction is built to handle heavy writes since merge is done occasionally.

Imagine keeping a big stack of papers and stapling them together when enough papers of similar size pile up. This can lead to old papers just sitting there waiting for their turn. Exactly the same happens with old segments, which can lead to key overlaps — file A might have keys from 1–100 while file B might have 50–150. There is no rule preventing overlap.

In size-tiered, compaction only happens when a whole tier fills up (e.g., 4 files of the same size). Until that trigger fires, all those stale, duplicate versions of keys accumulate on disk. During the merge itself, you need room for *both* the old files and the new merged file simultaneously, requiring up to ~2x disk space.

### 2. Leveled Compaction

Instead of rewriting large SSTables, we maintain different levels of storage (L0, L1, L2...). L0 contains the most recent segments. All levels beyond L0 have key-range partitioned tables (e.g. L1 may have one table for keys `a-m` and another for `n-z`). Each level has a fixed size limit that grows exponentially.

Here, compaction happens incrementally and uses less disk space compared to size-tiered compaction. It is more read-optimized since there are fewer tables to search:

- Since ranges don't overlap within a level, there is at most **one** file per level that could possibly contain a given key.
- Across 5–7 levels, that is a small, bounded number of files to check.

> **Tradeoff Summary**:  
> **Size-tiered** delays and batches cleanup work &rarr; **cheap writes**, but messy overlapping files &rarr; **expensive reads** and **more wasted space**.  
> **Leveled** does cleanup constantly in small pieces &rarr; keeps things tidy for **fast, bounded reads** and **low space usage**, but pays for that tidiness with higher write amplification.

---

## Bloom Filters

Reading a key in an LSM storage is slow if the key must be checked across multiple segment files to verify whether it exists. To solve this problem we use **Bloom Filters**.

We keep a Bloom filter for each SSTable. (A single large Bloom filter would only indicate if a key exists somewhere in the whole database, but wouldn't identify which SSTable file to open).

![Bloom Filters](https://miro.medium.com/v2/resize:fit:2000/format:webp/1*clnPjptGFEWA3ailNgWrkQ.png)

For every key in the SSTable we calculate several hash functions producing index positions for a bit array.

- If **any** of the bits at the calculated indices is `0`, we know with 100% certainty that the key does **not** exist in that SSTable, allowing us to safely skip it.
- If **all** bits are `1`, the key likely exists (or it's a *false positive*). We then consult the sparse index and data block.

Allocating ~10 bits of Bloom filter space per key achieves a false positive rate of just ~1%, significantly cutting unnecessary disk reads.

---

## Deleting a Key (Tombstones)

If you want to delete a key and its associated value in an immutable file system, you append a special deletion record called a **tombstone** to the memtable.

When log segments are merged during background compaction, the tombstone instructs the merging process to discard any previous values for that key. Once the tombstone is merged into the oldest segment, it can be dropped entirely.

---

## Summary

Every design decision in an LSM tree — **memtable, SSTable, sparse index, tombstones, background compaction, and bloom filters** — exists to **make writes as cheap as possible by deferring disk-heavy work (sorting, deduplicating, reclaiming space) to background operations.**

That is why LSM trees are the storage engine of choice for write-heavy systems like Cassandra, RocksDB, ScyllaDB, and HBase.

*References: Designing Data-Intensive Applications (DDIA) by Martin Kleppmann.*
