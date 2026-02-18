## 2026-02-18 - [Hook Order Violation with Memoization]
**Learning:** Adding `useMemo` or other hooks after a conditional return (e.g., `if (loading) return ...`) causes a React runtime crash because the number/order of hooks changes between renders.
**Action:** Always place hooks at the top level of the component, before any early returns or conditional logic.

## 2026-02-18 - [View Memoization Pattern]
**Learning:** When using `display: none` to switch between heavy views (like a Dashboard with charts and a Calculator), React still reconciles the entire hidden tree on every state change in the active view.
**Action:** Wrap major view segments in `useMemo` to isolate them. This prevents the hidden view from re-rendering when the active view's local state changes, significantly improving interaction latency.

## 2026-02-18 - [Optimizing Optional Heavy Libraries]
**Learning:** Libraries like `html-to-image` are relatively heavy (~15kB gzipped) and often used for optional features (like downloading a screenshot). Including them in the main bundle increases initial load time for all users.
**Action:** Use dynamic `import()` for optional libraries to move them into separate chunks that are only downloaded when the specific feature is triggered. This reduced the main bundle size by ~15% in this project.
