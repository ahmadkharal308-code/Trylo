# Feature modules

Each folder here is an **intentionally empty placeholder** for a future milestone. They
exist now only to make the planned structure visible — none contain logic yet. They will
be implemented and registered in `app.module.ts` in the order below (spec Section 13).

| Module      | Milestone (spec §13)                                  |
| ----------- | ----------------------------------------------------- |
| `sellers`   | 1. Seller onboarding + Gate 1 verification            |
| `products`  | 2. Product listing (photos, taxonomy, department)     |
| `taxonomy`  | (supports 2 & 3) editable category/sub-style tables   |
| `users`     | (supports auth across the app)                        |
| `swipes`    | 4. Swipe discovery flow                               |
| `sessions`  | 4 + 8. Session grouping for discovery & analytics     |
| `orders`    | 7 + 10. Order-intent handoff, packaging-proof photo   |
| `reviews`   | 9. Gate 2 reputation (ratings)                        |
| `disputes`  | 12-adjacent. Dispute records (photo-ready)            |
| `feedback`  | 8. Feedback instrumentation (built alongside)         |

> The recommendation/scoring engine (§5–6) and search (§3) will live in their own modules
> added when those milestones begin. Try-on (§11) is a later, separate integration.

Nothing in this milestone implements any of the above — see `CLAUDE.md` for the scope
guardrails.
