# TaskFlow — Engineering Decisions

## 1. Frontend State Management

### Decision: Zustand

TaskFlow uses Zustand as its global state management solution.

The application maintains board data, tasks, loading states, errors, and mutation status in a centralized store.

**Why Zustand?**

- Minimal boilerplate compared with Redux Toolkit.
- No need to wrap the application in multiple context providers.
- Supports selective state subscriptions, reducing unnecessary component updates.
- Keeps business logic and API mutation handling outside UI components.
- Makes optimistic updates and rollback easier to coordinate.

### Alternative considered: React Context API

React Context could manage the board and task state, but it would require additional reducer and provider logic as the application grows.

It also provides less convenient control over selective subscriptions.

**Trade-off:** Zustand introduces an additional dependency and requires developers to understand centralized state updates. For this application, the simplicity and separation of concerns outweigh that cost.

---

## 2. Concurrency and Race Condition Handling

### Problem

Multiple users or rapid interactions can attempt to modify the same board before earlier requests finish.

Without concurrency protection, updates may overwrite each other, create inconsistent task ordering, or produce duplicate cards.

### Client-side strategy

TaskFlow uses a serialized mutation queue.

Each mutation:

1. Generates an operation and applies its optimistic state update.
2. Adds the operation to the pending mutation list.
3. Waits for earlier API mutations to finish.
4. Uses the latest confirmed board revision.
5. Sends the API request.
6. Updates confirmed state when the server succeeds.
7. Removes the pending operation and rebuilds the visible state.

If an operation fails, it is removed from the pending list and the visible state is rebuilt from confirmed data and remaining pending operations.

This prevents a failed optimistic update from remaining permanently visible.

### Server-side strategy

The backend uses MongoDB transactions and board-level revision numbers.

Each mutation supplies an `expectedRevision`.

The server atomically checks the expected revision and increments the board revision. If the revision does not match, the operation is rejected with HTTP 409 Conflict.

This protects against stale writes.

Task ordering is persisted through explicit `orderIndex` values. Moving tasks updates the affected columns and normalizes their indexes.

### Five rapid moves under Slow 3G

I tested five rapid drag-and-drop operations under Chrome DevTools Slow 3G throttling:

1. To Do → In Progress
2. In Progress → Done
3. Done → To Do
4. To Do → Done
5. Done → In Progress

**Observed result:** The task appeared once in its final column, and no other tasks disappeared or showed visible ordering corruption.

This is a successful manual test, not a guarantee against every possible concurrency scenario.

---

## 3. AI-Assisted Development and Debugging Retrospective

AI tools were used as development assistants for implementation guidance, debugging, and code review.

However, generated suggestions were treated as proposals rather than automatically correct solutions.

### Actual debugging example: Empty source column during task movement

During development, we identified an important edge case in the task movement response.

An initial approach considered determining affected columns from the tasks returned by the server.

This approach was insufficient: if a task was moved out of a column and that column became empty, its identifier might not be recoverable from the returned task list.

The client could consequently retain stale tasks in its local state.

### Resolution

The backend response was updated to explicitly include:

- `sourceColumnId`
- `targetColumnId`
- `affectedColumnIds`
- Updated task data
- New board revision

The frontend now uses `affectedColumnIds` to remove stale tasks from all affected columns before inserting the updated server data.

### Lesson learned

AI-generated code must be validated against actual application invariants and edge cases.

In particular, testing empty columns, failed requests, stale revisions, and rapid operations is more valuable than relying exclusively on whether the happy path works.

---

## 4. Scalability Analysis: 50,000 Tasks and 100 Concurrent Users

The current implementation is designed for a small-to-medium Kanban workspace. It is not yet optimized for 50,000 tasks and 100 concurrent users.

### Potential bottlenecks

**1. Large task payloads**

Fetching all tasks for a board becomes increasingly expensive as the number of tasks grows.

**Improvement:** Implement server-side pagination, filtering, and sorting. Retrieve only the tasks required for the current view.

**2. Board-level revision contention**

Every mutation increments the same board revision.

With 100 concurrent users, this can produce frequent revision conflicts and retries, even when users modify unrelated tasks.

**Improvement:** Introduce finer-grained concurrency control, such as column-level or task-level revisions, while preserving atomic ordering guarantees.

**3. Task ordering operations**

Moving a task currently involves reading and updating tasks in the affected columns to normalize their `orderIndex` values.

Large columns can make these operations expensive.

**Improvement:** Consider fractional indexing or rank-based ordering to reduce the number of documents updated during a move. Periodic rebalancing can handle rank exhaustion.

**4. Database workload**

Frequent task reads and writes can increase MongoDB load.

**Existing optimizations:**

- Compound index on `boardId`, `columnId`, and `orderIndex`.
- Index on `boardId` and `priority`.
- Lean queries for read operations.
- MongoDB transactions for atomic mutations.

**Further improvements:** Add pagination-aware indexes, query profiling, connection-pool tuning, and caching for frequently accessed board metadata.

**5. Frontend rendering**

Rendering thousands of task cards simultaneously would increase browser memory consumption and affect responsiveness.

**Improvement:** Introduce list virtualization, such as rendering only visible cards, and consider splitting large boards into independently loaded column views.

### Proposed scalable architecture

For a larger deployment:

- React with Zustand for frontend state.
- Node.js and Express for API services.
- MongoDB with optimized indexes and transactional writes.
- Redis for caching and distributed coordination where appropriate.
- Cursor-based pagination for task retrieval.
- WebSockets for real-time updates across users.
- Monitoring and structured logging for conflict rates and API latency.

### Conclusion

TaskFlow currently prioritizes correctness through optimistic updates, serialized client mutations, revision checks, and transactional persistence.

Scaling to 50,000 tasks and 100 concurrent users would require pagination, finer-grained concurrency control, efficient ordering, and frontend virtualization.