# EvoFlow Smart Memory Patch

## Files included
- workers/executor/src/index.ts
- workers/executor/src/lib/ollama.ts
- workers/executor/src/lib/memory.ts

## Optional `.env` additions for the executor
Add these to:
`C:\EvoFlow\workers\executor\.env`

```env
MEMORY_LOOKBACK_RUNS=12
MEMORY_MAX_RELEVANT_RUNS=4
MEMORY_MIN_SCORE=1
```

## What this patch changes
- Keeps multi-step agent flow: planner -> executor -> reviewer
- Adds smarter memory retrieval
- Scores earlier completed runs by:
  - keyword overlap
  - same task type
  - follow-up phrases like "improve", "previous", "explain"
- Only sends the most relevant memory into the prompts
- Stores memory metadata in the run result

## What to test in the dashboard
Run these in order from the test panel.

### Test 1
```json
{
  "message": "Write a simple TypeScript function that validates email addresses."
}
```

### Test 2
```json
{
  "message": "Improve the previous email validator and make it more robust."
}
```

### Test 3
```json
{
  "message": "Explain the improvements you made to the previous validator in simple terms."
}
```

### What you should expect
In runs 2 and 3:
- `memoryUsed` should usually be true
- `memoryRunCount` should be greater than 0
- `memorySummary` should mention why earlier runs were selected
- planner/executor/reviewer should refer to the prior validator work more clearly
