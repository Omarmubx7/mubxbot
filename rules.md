# MubxBot Rules & Design System

## General Rules
- Always use the latest version of the files.
- The bot name is "MUBXBOT".
- The bot is for HTU School of Computing only.
- there are only 3 section CS && ai && cyber so fix the json file

## "App Development" Design System (Figma)
When adding new features or components, you MUST adhere strictly to these design principles to match the high-fidelity Figma design:

### 1. Minimal & Clean Layout
- **Containers:** Use solid backgrounds like `bg-[#F8F9FA]` for light mode and `bg-[#1C1C1E]` for dark mode.
- **Borders:** Always use subtle, low-opacity borders to define edges (e.g., `border-[#E9ECEF] dark:border-[#2C2C2E]`).
- **Shadows:** Use colored, soft drop shadows for primary elements (e.g., `shadow-[0_2px_8px_rgba(0,122,255,0.3)]`).
- **Desktop:** The app should have a `max-w-[960px]` container centered in the viewport with a shadow, matching the `App Development` layout.

### 2. Typography
- **Font:** The app MUST use the SF Pro font family (`SF Pro Display` for headers, `SF Pro Text` for body).
- **Headers:** Use tight letter spacing (`tracking-tight`) and heavy font weights (`font-bold`, `font-black`).
- **Labels:** Small structural text (like "Office Hours" or table headers) should be ultra-small (`text-[10px]` or `11px`), `uppercase`, `font-black`, and use wide tracking (`tracking-widest`).
- **Colors:** Strictly use `var(--text-primary)` and `var(--text-secondary)`. Never use hard black or white for text.

### 3. Border Radii & Shapes
- The design uses highly rounded corners. Avoid sharp edges.
- Use `rounded-[28px]` or `rounded-3xl` for main cards and large overlays.
- Use `rounded-2xl` for standard buttons, inputs, and list items.
- Use custom classes from `globals.css` where applicable (`.bubble-radius`, `.chip-radius`, `.input-radius`).

### 4. Interactive & State UX
- **Transitions:** Every interactive element must have `transition-all duration-200` (or 300).
- **Active States:** Buttons must scale down when pressed using `active:scale-95` or `active:scale-90`.
- **Hover States:** Use subtle background opacity shifts (e.g., `hover:bg-black/5 dark:hover:bg-white/10` or `hover:bg-[var(--primary)]/5`).
- **Icons:** Use Lucide-react icons, often placed inside rounded, tinted background circles for emphasis.

### 5. Layout & Viewport
- **Safe Areas:** Always use `pt-safe` and `pb-safe` on top/bottom edge containers to prevent mobile notch/home bar overlapping.
- **Full Height:** Use `h-[100dvh]` and `max-h-[100dvh]` instead of `min-h-screen` to prevent browser UI from covering the app.
- **Scrolling:** The body has `overscroll-behavior: none`. Internal scrollable areas must hide scrollbars (`no-scrollbar`).
