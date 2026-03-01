Here’s a version of the prompt tailored for **Framer** instead of Figma.

You can paste this directly into Framer’s AI (or as a brief) to generate the full mobile‑first MubxBot chat design.

***

**Prompt for Framer: Design the MubxBot Chat UI**

You are an expert Framer designer.  
Build a **single-page chat interface** for my project using the exact spec below.  
Do **not** improvise a different style; only implement what I describe.

### 0. Canvas & frame setup

- Create one main **page** / frame for the chat:
  - Mobile base size: **390 × 844 px** (iPhone‑style viewport).
- The design must be **mobile-first**, but responsive:
  - On larger widths, the layout should **stretch wider**, not change structure.
  - Same header, same bubbles, same input bar on all sizes.

Use Framer’s **Auto Layout / Stack** features where helpful.

***

### 1. High-level concept

- Screen: **Student chat with bot “MubxBot”** to find HTU computing instructors.
- Single-panel chat:
  - Header at top.
  - Messages list in the middle.
  - Input bar at bottom.
- No sidebars, no navigation tabs, no extra pages.
- Style: **Apple / iMessage inspired**, clean, minimal.

***

### 2. Visual system (colors, type, spacing)

#### 2.1 Colors

Light mode:

- User bubbles: `#007AFF`
- Bot bubbles: `#E9ECEF`
- Chat background: `#F8F9FA`
- Page background: `#FFFFFF`
- Text primary: `#1C1C1E`
- Text secondary: `#8E8E93`
- Accent / links / focus: `#007AFF`

Dark mode:

- User bubbles: `#0A84FF`
- Bot bubbles: `#2C2C2E`
- Chat background: `#1C1C1E`
- Page background: `#000000`
- Text primary: `#FFFFFF`
- Text secondary: `#98989D`
- Accent / links / focus: `#0A84FF`

User bubble must always be blue (light or dark).  
No bright/neon colors or heavy gradients, except a **subtle gradient in the avatar** if you like.

#### 2.2 Typography

Use a system-like font (SF Pro / Inter) for everything.

Sizes:

- Bot name “MubxBot”: 15 px, semibold
- Status “Online”: 12 px, regular
- Message text: 15 px, regular
- Timestamps: 11 px, regular
- Quick replies: 14 px, medium
- Input text & placeholder: 15 px, regular
- Empty state title: 18 px, semibold
- Empty state description: 14 px, regular

Line height:

- Headers: 1.2
- Messages: 1.4

#### 2.3 Spacing & radius

Base spacing unit: 4 px.

- Bubble padding: ~10 px vertical, 14 px horizontal.
- Space between messages: 8–12 px.
- Header padding: 12 px top/bottom, 16 px sides.
- Input bar padding: 12 px top/bottom, 16 px sides.

Radii:

- Bubbles: 18 px
- Quick reply chips: 20 px
- Input field: 24 px (pill)
- Send button: full circle
- Page/card corners: 0 on mobile; can become 16 px when you preview wider.

Shadows: very subtle; like iOS sheet shadows.

***

### 3. Layout in Framer

Use Framer’s layout tools to match this structure.

#### 3.1 Overall page

- Background: page background color (white for light, black/dark for dark).
- Vertical layout:
  - Header (fixed height)
  - Messages area (flex / scrollable)
  - Input bar (fixed height)

The page should respond so that:

- At **390×844**: looks like a full-screen mobile chat.
- On **wider viewports**: content width grows up to ~720–960px, with the same vertical structure.

#### 3.2 Header

Position: top of the screen, height ~60 px.

Contents:

- Left: avatar (36×36 circle)
  - Gradient fill in blue tones.
  - White robot or graduation cap icon inside.
- Middle:
  - Line 1: “MubxBot” (15 px, semibold).
  - Line 2: “Online” (12 px, secondary text color).
- Right: theme toggle button (32×32 circle)
  - Icon: sun (for light) / moon (for dark).

Make this a **horizontal stack** with Auto Layout for spacing and vertical center alignment.

#### 3.3 Messages area

- A vertical stack that can scroll.
- Example messages:
  1. Bot welcome message:
     > "Hi! 👋 I can help you find HTU computing instructors. Try typing a name like 'Israa' or a department like 'Cyber Security'."
  2. Quick reply chips below it: `Search name`, `By department`, `Office hours`.
  3. Sample user message: "Show me Israa".
  4. Detailed doctor info message with:
     - `👤 Israa Ibrahim Saadeh`
     - `🏫 Cyber Security`
     - `🏢 S-321`
     - `✉️ israa.hasan@htu.edu.jo`
     - `🕐 Office Hours:` and a bullet list.

Message bubbles:

- Bot messages: left aligned, max 75% of width, bot bubble color, 18 px radius.
- User messages: right aligned, max 75% of width, blue background, white text, 18 px radius.
- Show small **timestamps** under at least one message (11 px, secondary text).

Quick replies:

- Horizontal wrap / grid: pill-shaped buttons with border in blue, text in blue.

Typing indicator:

- Bot bubble with three dots (`● ● ●`), styled like other bot bubbles.

Empty state (can be a separate variant/frame):

- 🎓 icon
- Title: “HTU Computing Directory”
- Text: “Search for instructors by name, department, or office.”

#### 3.4 Input bar (bottom)

Height: ~72 px.

Layout (horizontal stack):

- Left: 36×36 circular button with “+”.
- Middle: pill input:
  - 40 px high, full remaining width.
  - Placeholder: “Type doctor name…”
- Right: 40×40 circular button with send icon (paper plane / arrow).

***

### 4. Responsiveness in Framer

Use Framer’s responsive features so:

- At base frame 390×844, it looks exactly as designed.
- When width increases:
  - The entire content **stretches horizontally**:
    - Header, chat area, and input bar expand to fill width.
    - Bubbles still max at ~70–75% of the container.
  - No new columns or sidebars – same layout, just more space.

Guidelines:

- Pin header and input to left/right.
- Set messages stack to **width: Fill container** horizontally.
- Set the outer frame’s width to “Fill” on larger breakpoints but keep the design centered visually.

***

### 5. Interaction hints (no need to fully wire logic)

You can add small notes or prototype touches:

- Message entrance: tiny upward movement + fade.
- Typing indicator: simple looping animation for dots if you want.
- Quick replies: hover and tap states (scale down a bit on tap).
- Theme toggle: rotates icon 180° on state change.

But do not add extra screens; this is only about the **chat screen UI**.

***

### 6. Final instructions

- Follow the spec for colors, typography, spacing, and layout.
- Use the **390×844 mobile frame** as the primary reference.
- Ensure the page looks good when previewed on both phone and desktop widths, with the same layout becoming wider.
- The result should be a Framer design that a developer can copy visually into React/Tailwind without guessing.