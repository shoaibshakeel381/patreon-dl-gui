## Stop behavior with concurrency
Currently post concurrency is disabled if stop.on condition is specified. The current behavior is deliberate: when any stopOn condition is set, PostDownloader caps workers at one because a stop condition can only be acted on after a post is checked. With multiple workers, later posts may already be running by then. The code also stops workers from claiming new posts once the condition is met, but it can’t undo work already underway. 

## Possible approaches to change this:
1. **Allow bounded overshoot.** Keep the worker pool and let in-flight posts finish after a stop condition is found. Simple and fast, but posts beyond the boundary may still download. The maximum overshoot is related to the concurrency limit.

2. **Use ordered batches.** Process up to *N* posts concurrently, then wait for the whole batch before deciding whether to fetch or process more. This preserves a clear stopping point between batches, but a boundary post may still be accompanied by downloads later in its batch.

3. **Process concurrently, but apply results in list order.** Workers can fetch and prepare posts in parallel while a coordinator checks stop conditions and commits downloads in the original post order. This can preserve the existing stop semantics more closely, but it requires separating post processing into stages and may leave workers idle while waiting for earlier posts.

4. **Make stopping configurable.** Keep serial behavior as the safe default, and add a setting for concurrent processing with documented overshoot. This gives users a speed-versus-precision choice, though it adds configuration and behavior to explain.

Favor **option 3** if stopping exactly at the boundary matters. If a small amount of overshoot is acceptable, **option 1** is the simplest change. The repo already tests that a stop condition prevents later posts from being scheduled, so that test would need to change depending on the chosen semantics.
Choose Option 1 for “stop scheduling once detected” behavior and are comfortable with some in-flight downloads finishing. Choose Option 4 if preserving current stop behavior matters and concurrency should be an explicit choice.

### Option 1: Always allow concurrency, accept overshoot

Use the configured `maxConcurrentPosts` even when `stopOn` is set. Workers stop claiming new posts once one worker detects the stop condition, but other workers may already be processing posts.

For example, with concurrency set to 4, a worker might find an already-downloaded post while up to three other posts are in progress. Those posts may finish downloading, even if they come after the stopping point.

**Advantages:** Simple implementation, faster downloads, and no new setting.

**Tradeoff:** `stopOn` becomes approximate under concurrency. Users may get extra downloads past the intended boundary.

### Option 4: Make concurrency with `stopOn` configurable

Keep today’s precise, serial behavior as the default. Add a setting that lets users opt into concurrent processing when `stopOn` is active. The opt-in mode accepts the same possible overshoot as Option 1.

**Advantages:** Preserves existing behavior for users who rely on an exact stopping point, while letting others choose faster downloads.

**Tradeoffs:** Adds a setting that needs documentation and support in the CLI/configuration. Users also need to understand that opting in may download posts beyond the stop point.

### Comparison

| | Option 1 | Option 4 |
|---|---|---|
| Default with `stopOn` | Concurrent | Serial |
| Speed | Faster | User chooses |
| Stop precision | May overshoot | Precise by default; may overshoot when opted in |
| Implementation | Smaller change | More configuration and documentation work |
| Compatibility | Changes existing behavior | Preserves existing behavior by default |

Choose **Option 1** if you want `stopOn` to mean “stop scheduling once detected” and are comfortable with some in-flight downloads finishing. Choose **Option 4** if preserving current stop behavior matters and concurrency should be an explicit choice.

## Conclusion

For now I am leaning towards **Option 1** for simplicity, but I will keep **Option 4** in mind for users who need precise stopping behavior.