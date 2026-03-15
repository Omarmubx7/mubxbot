# Copilot Instructions for MubxBot

## Project Overview

MubxBot is a Next.js 15 web application for HTU's School of Computing. It provides an iMessage-style AI chatbot that lets students look up instructor office hours, locations, and contact information. It also includes an admin dashboard for managing instructor data.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **UI:** React 19, Tailwind CSS v4, Framer Motion, Lucide React icons
- **AI:** OpenAI API (GPT-4o-mini by default)
- **Auth (admin):** Microsoft MSAL / Azure AD
- **Data:** JSON flat files under `data/` (no database in V1)
- **Deployment:** Vercel

## Repository Structure

```
app/                 # Next.js App Router pages and API routes
  api/               # API route handlers (chat, admin CRUD, etc.)
  admin/             # Admin dashboard pages
  test-chat/         # Dev/test chat page
components/          # Shared React components
data/                # JSON data files (instructors, office hours)
lib/                 # Utility modules (OpenAI client, data helpers)
public/              # Static assets
scripts/             # One-off data scripts (e.g., parse.js)
rules.md             # Design system rules — read before building UI
prd.md               # Full product requirements document
```

## Coding Conventions

- Use **JavaScript** (not TypeScript) — the project has no TypeScript configuration.
- Use **Next.js App Router** conventions: `page.js`, `layout.js`, `route.js` inside `app/`.
- Use **Tailwind CSS** utility classes for all styling. Never write inline styles or separate CSS files unless extending `app/globals.css`.
- Import icons from `lucide-react`.
- Use `framer-motion` for animations.
- Keep API routes under `app/api/` as Route Handlers (`route.js`).

## Design System (from `rules.md`)

Always follow these rules when creating or modifying UI components:

1. **Colors:** Light mode uses `bg-[#F8F9FA]`; dark mode uses `bg-[#1C1C1E]`. Use CSS variables `var(--text-primary)` and `var(--text-secondary)` for text — never raw `black` or `white`.
2. **Typography:** Use SF Pro font family. Headers use `tracking-tight font-bold`. Small labels use `text-[10px] uppercase font-black tracking-widest`.
3. **Borders & Radius:** Main cards use `rounded-[28px]` or `rounded-3xl`. Buttons/inputs use `rounded-2xl`. Always use subtle low-opacity borders.
4. **Interactions:** All interactive elements need `transition-all duration-200`. Buttons need `active:scale-95`. Hover states use low-opacity background shifts.
5. **Viewport:** Use `h-[100dvh]` (not `min-h-screen`). Apply `pt-safe` and `pb-safe` on edge containers. Hide scrollbars on internal scrollable areas using the `no-scrollbar` class.
6. **Max width:** Desktop layout uses `max-w-[960px]` centered container.

## Data Model

Instructor data lives in JSON files under `data/`. The three sections are **CS**, **AI**, and **Cyber**. Each instructor has fields like name, email, office location, office hours, and courses taught.

## Environment Variables

Required in `.env`:
- `OPENAI_API_KEY` — OpenAI API key (gpt-4o-mini used by default)
- `OPENAI_MODEL` — Optional model override
- Azure/MSAL credentials for admin authentication

## Running the Project

```bash
npm install
npm run dev      # Development server
npm run build    # Production build
npm run lint     # ESLint (next/core-web-vitals)
```

## Key Principles

- **Mobile-first**: The primary users are students on mobile devices. Always verify mobile layouts.
- **Performance**: Keep bundle size small; prefer built-in Next.js features over heavy third-party libraries.
- **Accessibility**: Use semantic HTML and ARIA labels on interactive elements.
- **No breaking changes to the data schema** without updating all consumers in `lib/` and `app/api/`.
