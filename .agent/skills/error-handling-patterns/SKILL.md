---
name: error-handling-patterns
description: Master error handling patterns across languages including exceptions, Result types, error propagation, and graceful degradation to build resilient applications. Use when implementing error handling, designing APIs, or improving application reliability.
---

# Error Handling Patterns

Build resilient applications with robust error handling strategies that gracefully handle failures and provide excellent debugging experiences.

## When to use this skill
- Implementing error handling in new features
- Designing error-resilient APIs
- Debugging production issues
- Improving application reliability
- Creating better error messages for users and developers
- Implementing retry and circuit breaker patterns
- Handling async/concurrent errors
- Building fault-tolerant distributed systems

## Workflow
1. **Identify Error Category:** Determine if the error is recoverable (e.g., network timeouts, invalid input) or unrecoverable (e.g., out of memory, stack overflow).
2. **Select Error Handling Philosophy:** Choose between Exceptions (for unexpected errors), Result Types (for expected errors), or Option/Maybe Types (for nullable values).
3. **Implement Language-Specific Patterns:** Use the appropriate pattern for your language (e.g., Custom Exception Hierarchy in Python, Custom Error Classes in TypeScript, Result/Option Types in Rust, Explicit Error Returns in Go).
4. **Apply Universal Patterns if necessary:** Implement Circuit Breaker, Error Aggregation, or Graceful Degradation patterns for more complex scenarios.
5. **Review Best Practices:** Ensure you are failing fast, preserving context, providing meaningful messages, logging appropriately, and cleaning up resources.

## Instructions

### Core Concepts
**Exceptions vs Result Types:**
- **Exceptions**: Traditional try-catch, disrupts control flow. Best for unexpected errors.
- **Result Types**: Explicit success/failure, functional approach. Best for expected errors.
- **Error Codes**: C-style, requires discipline.
- **Option/Maybe Types**: For nullable values.

### Best Practices to Follow Strictly
1. **Fail Fast**: Validate input early, fail quickly.
2. **Preserve Context**: Include stack traces, metadata, timestamps.
3. **Meaningful Messages**: Explain what happened and how to fix it.
4. **Log Appropriately**: Error = log, expected failure = don't spam logs.
5. **Handle at Right Level**: Catch where you can meaningfully handle.
6. **Clean Up Resources**: Use try-finally, context managers, defer.
7. **Don't Swallow Errors**: Log or re-throw, don't silently ignore.
8. **Type-Safe Errors**: Use typed errors when possible.

### Common Pitfalls to Avoid
- **Catching Too Broadly**: `except Exception` hides bugs.
- **Empty Catch Blocks**: Silently swallowing errors.
- **Logging and Re-throwing**: Creates duplicate log entries.
- **Not Cleaning Up**: Forgetting to close files, connections.
- **Poor Error Messages**: "Error occurred" is not helpful.
- **Returning Error Codes**: Use exceptions or Result types where applicable.
- **Ignoring Async Errors**: Unhandled promise rejections.

## Resources
- Consult `scripts/` or language-specific examples in this folder if needed. (See accompanying files for language-specific examples).
