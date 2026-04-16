MUBX Admin redesign plan: turn the current admin into a production-grade, trust-first, real-time conversation intelligence dashboard.

Core rule set:
- Show only real backend data from the database or API.
- If data is missing, delayed, disconnected, or incomplete, show the correct state explicitly instead of inventing numbers.
- Never render placeholder analytics, synthetic rows, cached stale values without warning, or demo charts.
- Every widget must expose freshness and provenance.
- Separate master data, response rules, analytics, and feedback into distinct admin areas.

Phase 0: Audit and guardrails
- Inventory current admin routes, data sources, and live-sync behavior.
- Define the trust vocabulary used everywhere: live, historical, stale, reconnecting, loading, empty, permission denied, query failed.
- Remove any UI language that implies certainty when backend data is missing or delayed.
- Confirm the analytics APIs can support session-level drill-down and export.

Phase 1: Trust-first admin shell
- Rework the shared admin header and sync controls so every page shows backend-only status and a visible freshness line.
- Rename and organize the top-level navigation around the real operational split: Instructors Directory, Static Bot Responses, Analytics & Quality, User Feedback.
- Add a clear dashboard banner that distinguishes real-time polling from historical queries.
- Standardize loading, empty, stale, reconnecting, and error states across all admin pages.

Phase 2: Conversations workspace
- Make Conversations the primary tab inside Analytics.
- Show one row per live session with user id, session id, first message time, last activity time, message count, intent, status, feedback state, and transcript drill-down.
- Add filters for date range, user, session, department, intent, status, feedback, and escalation state.
- Add exact transcript detail that reads only from stored messages.
- Make CSV export available for every table and detail view.

Phase 3: Real-time analytics and quality
- Redesign Overview, Search Analytics, Quality & Errors, and Performance around real backend metrics only.
- Label every metric and chart as live or historical and show data age when it crosses the freshness SLA.
- Replace summary-only patterns with drill-through links that always lead back to conversation detail.
- Ensure the UI distinguishes currently active users from users in the selected date range.

Phase 4: Feedback and operational pages
- Rework User Feedback so it is explicitly tied to conversations and transcripts.
- Keep Instructors Directory and Static Bot Responses focused on master data and rule management only.
- Align the operational pages with the same trust and freshness rules used in analytics.

Phase 5: Data and API alignment
- Normalize the analytics model around users, sessions, messages, feedback, intents, instructors, and response_rules.
- Define REST and live-update contracts for current state and historical queries.
- Add Power BI-ready exports and star-schema mapping.
- Validate that cached frontend state cannot be mistaken for live backend data.

Start now:
- Implement Phase 1 first by updating the shared admin shell, then move into the Conversations workspace and drill-down flow.