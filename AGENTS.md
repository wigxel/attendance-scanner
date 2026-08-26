<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

## Testing Convention

Use the simplest assertion that works:

| Assertion | Use for |
|-----------|---------|
| `toBe(value)` | Primitives: strings, numbers, booleans |
| `toBeNull()` | Null checks (never `toMatchInlineSnapshot(null)`) |
| `toBeUndefined()` | Undefined checks |
| `toHaveLength(n)` | Array/string length |
| `toContain(item)` | Array membership |
| `toMatchInlineSnapshot()` | Multi-property objects or arrays — only when seeing the full structure inline is valuable |
| `toMatchObject(expect.*)` | Large objects (>10 props or deeply nested) — assert a subset, don't dump the whole thing |

### Rule of thumb

- **One value check?** → `toBe()`
- **Need to see the shape?** → `toMatchInlineSnapshot()`
- **Big object, only care about a few fields?** → `toMatchObject()` + field assertions
