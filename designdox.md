Here is a fully detailed, “no-thinking, just-apply” UI/UX spec you can give to an AI or dev. It expands everything: visuals, behavior, edge cases, and implementation preferences.

You can copy–paste this as your final design prompt.

***

# Computing Doctors Directory Chatbot  
## Fully Detailed UI/UX Design Specification (MubxBot)

**Project:** HTU School of Computing Doctors Directory – Student Chat  
**Bot Name:** **MubxBot**  
**Design Philosophy:** Apple-inspired minimalism + modern chatbot UX  
**Target Users:** University students searching for instructor information  
**Date:** March 1, 2026

Your job: **Implement this design exactly. Do not improvise.**  
If something is not specified, pick the simplest option that matches this document and iOS/Apple style.

***

## 1. Product context & goals

### 1.1 What this screen is

This specification is for **one main screen**:

> A chat interface where students talk to **MubxBot** to find HTU computing instructors (doctors).

It is:

- A **single-page**, **single-panel** chat experience.
- Student-facing only (no admin UX here).
- Built to be **mobile-first** but also look great on desktop.

### 1.2 Core goals

- Let students quickly get information about computing instructors:
  - Name
  - School
  - Department
  - Office
  - Email
  - Office hours
- Make it feel like chatting in iMessage (familiar, low friction).
- Make it beautiful and polished enough to feel like an Apple app.

### 1.3 Non-goals for this spec

- No admin dashboard design here (that is separate).
- No login/auth flows.
- No voice input (V2).
- No multi-language UI (English only in V1).

***

## 2. Design principles

### 2.1 Core values

- **Clarity over cleverness**  
  Everything should be instantly understandable. No complex UI patterns.

- **Efficiency**  
  A typical student should find what they need in **2–3 messages**.

- **Delight without distraction**  
  Small, smooth animations (e.g., message entrance, typing indicator) but nothing flashy or annoying.

- **Familiarity**  
  Feels like iMessage/WhatsApp: chat bubbles, header, input bar.

### 2.2 Brand personality

- **Helpful** – MubxBot offers suggestions, clear answers, friendly prompts.
- **Professional** – Appropriate for a university; no memes or slang.
- **Approachable** – Uses natural language, emojis only where they help.
- **Reliable** – Layout and data presentation give a sense of trust and accuracy.

***

## 3. Visual design system

### 3.1 Color palette

Use these exact colors (or very close Tailwind equivalents):

**Light mode:**
```text
Primary (user bubbles):      #007AFF   (iOS blue)
Bot bubbles:                 #E9ECEF   (light gray)
Chat background:             #F8F9FA   (off-white)
Page background:             #FFFFFF   (pure white)
Text primary:                #1C1C1E   (near-black)
Text secondary:              #8E8E93   (muted gray)
Accent / links / focus:      #007AFF
Success (secondary use):     #34C759
```

**Dark mode:**
```text
Primary (user bubbles):      #0A84FF   (lighter blue)
Bot bubbles:                 #2C2C2E   (dark gray)
Chat background:             #1C1C1E
Page background:             #000000
Text primary:                #FFFFFF
Text secondary:              #98989D
Accent / links / focus:      #0A84FF
Success (secondary use):     #30D158
```

Rules:

- User bubble color MUST be consistent (blue) across light/dark.
- Never use bright red, neon colors, or strong gradients (except subtle in avatar).
- Links (email) must clearly look like links (color + underline on hover).

### 3.2 Typography

**Font stack:**
```text
Primary:
  -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif

Monospace (for office hour times if needed):
  "SF Mono", ui-monospace, Menlo, Monaco, monospace
```

**Size & weight:**

- App title (if shown separately): 20px, weight 600
- Bot name (“MubxBot”): 15px, weight 600
- Status text (“Online”): 12px, weight 400
- Message body text: 15px, weight 400
- Timestamps: 11px, weight 400
- Quick reply labels: 14px, weight 500
- Input text & placeholder: 15px, weight 400
- Empty state title: 18px, weight 600
- Empty state description: 14px, weight 400

**Line height:**

- Headers & titles: 1.2
- Message text & descriptions: 1.4

Rules:

- Do not use more font families.
- Keep all text sizes within ±1px of the above if needed for responsiveness.

### 3.3 Spacing system

Base unit: **4px**

Use only multiples of 4px for padding/margins.

Suggested tokens:

```text
Micro:   4px   (tiny gaps inside components)
XS:      8px   (bubble vertical padding)
S:       12px  (bubble horizontal padding)
M:       16px  (space between bubbles vertically)
L:       24px  (space between bubble groups, sections)
XL:      32px  (layout sections)
XXL:     48px  (top/bottom margin on desktop card)
```

Examples:

- Bubble padding: 10px (vertical) × 14px (horizontal) ≈ between XS and S.
- Vertical spacing between messages: 8–12px.
- Padding inside header: 12px vertical, 16px horizontal.
- Input bar padding: 12px vertical, 16px horizontal.

### 3.4 Corners & radius

```text
Chat bubbles:            18px radius (all corners)
User bubble tail:        use pseudo-element triangle
Bot bubble tail:         same
Quick reply chips:       20px (fully pill-shaped)
Input field:             24px (very rounded, pill style)
Send button:             50% (perfect circle)
Chat card (desktop):     16px
Modal / overlays (future): 12px
```

### 3.5 Shadow & depth

**Light mode:**
```text
Chat card:       0px 2px 8px rgba(0,0,0,0.04)
Message bubble:  0px 1px 2px rgba(0,0,0,0.06)
Input bar:       0px -1px 3px rgba(0,0,0,0.05)
```

**Dark mode:**
```text
Chat card:       0px 4px 12px rgba(0,0,0,0.3)
Message bubble:  0px 1px 2px rgba(0,0,0,0.2)
Input bar:       0px -1px 3px rgba(0,0,0,0.2)
```

Never overdo shadows; they should be subtle.

***

## 4. Layout & structure

### 4.1 Mobile layout (default, <768px)

Full height, single column chat layout.

ASCII:

```text
┌────────────────────────────┐
│ HEADER (fixed, 60px)       │
│ [avatar] MubxBot     🌙    │
│        Online              │
├────────────────────────────┤
│                            │
│ CHAT AREA (scrollable)     │
│ [messages ...]             │
│                            │
├────────────────────────────┤
│ INPUT BAR (fixed, 72px)    │
│ [+]  [type here...]  [→]   │
└────────────────────────────┘
```

Dimensions:

- Header height: 60px, padding `12px 16px`.
- Input bar height: 72px, padding `12px 16px`.
- Chat area height: `calc(100vh - 132px)`, padding 16px.
- Chat area: `overflow-y: auto`.

Header is fixed at top, input bar fixed at bottom (sticky or fixed positioning).

### 4.2 Desktop layout (≥768px)

Centered chat card, more breathing room.

ASCII:

```text
PAGE BACKGROUND
┌────────────────────────────────┐
│                                │
│      ┌───────────────────┐     │
│      │ CHAT CARD         │     │
│      │ [Header]          │     │
│      │ ─────────────     │     │
│      │ [Messages]        │     │
│      │                   │     │
│      │ ─────────────     │     │
│      │ [Input Bar]       │     │
│      └───────────────────┘     │
│                                │
└────────────────────────────────┘
```

Details:

- Card max-width: 480px.
- Card min-height: ~600px.
- Card centered horizontally with `margin: 0 auto`.
- Top margin: ~5vh–10vh.
- Card background: `#FFFFFF` (light), `#1C1C1E` (dark).
- Card border-radius: 16px.
- Card full height on small laptop screens is acceptable.

***

## 5. Components & behavior

### 5.1 Header

**Content:**

- Left: Avatar
- Middle: Bot name & status
- Right: Theme toggle

Visual:

```text
[ 🤖 ]  MubxBot
        Online                    🌙
```

Details:

- Avatar:
  - 36×36px circle.
  - Gradient background: from primary blue (#007AFF) to a lighter blue.
  - Icon: white robot head or white graduation cap, centered.
- Bot name:
  - Text: “MubxBot”
  - Font: 15px, semibold.
- Status:
  - Text: “Online”
  - Font: 12px, regular, secondary color.
- Theme toggle:
  - Shape: 32×32px circle.
  - Icon:
    - If light mode: sun icon.
    - If dark mode: moon icon.
  - Hover: light gray overlay (light mode), slightly lighter dark overlay (dark mode).
  - Click: toggles theme and rotates icon 180°.

Behavior:

- On mobile: fixed at top, always visible.
- On scroll: optional small shadow or subtle blur behind header.

Accessibility:

- Theme toggle `aria-label="Toggle light and dark theme"`.

***

### 5.2 Messages & bubbles

Each message has:

- `sender`: `"user"` or `"system"`
- `content`: text/JSX
- `timestamp`

#### 5.2.1 Bot message (simple text)

Example:

> “Hi! Type a doctor’s name and I’ll show their info.”

Layout:

- Align left.
- Bubble max width: 75% of chat width.
- Padding: `10px 14px`.
- Radius: `18px`.
- Background:
  - Light: `#E9ECEF`
  - Dark: `#2C2C2E`
- Text:
  - Light: `#1C1C1E`
  - Dark: `#FFFFFF` or `#E5E5EA`
- Tail:
  - Slight triangle on bottom-left using `::before`.
- Timestamp:
  - Below bubble, aligned left.
  - Font: 11px, secondary color.

#### 5.2.2 User message

Example:

> “Show me Israa”

Layout:

- Align right.
- Max width: 75%.
- Padding: `10px 14px`.
- Radius: `18px`.
- Background: primary blue (`#007AFF` or `#0A84FF` in dark).
- Text: `#FFFFFF`.
- Tail: triangle on bottom-right with `::before`.
- Timestamp:
  - Below bubble, right aligned.

#### 5.2.3 Doctor info message (structured)

Content:

- Header line: `👤 [Full Name]`
- Department line: `🏫 [Department]`
- Office line: `🏢 [Office]`
- Email line: `✉️ [email]` (clickable `mailto:`)
- Office hours block: `🕐 Office Hours:` then list:
  - `• Monday: ...`
  - `• Tuesday: ...`
  - etc.

Layout:

- A single bot bubble (left aligned) with:
  - Slightly more padding (e.g., 14px 16px).
  - Maybe visual separation between sections (small gaps).
- Email:
  - Underline on hover.
  - `href="mailto:<email>"`.
  - `aria-label="Send email to [name]"`.
- Office hours:
  - Optional use monospace font for times.
  - Each day on its own line with bullet.

***

### 5.3 Quick reply buttons

Placed directly under the relevant bot message.

Example usage:

- After welcome:
  - `Search name`, `By department`, `Office hours`.
- After an answer:
  - `Search another`, `Office hours only`.

Visual:

- Pill-shaped buttons.
- Padding: `8px 16px`.
- Border-radius: `20px`.
- Border: `1.5px solid #007AFF`.
- Text:
  - Color: #007AFF.
  - Font: 14px, medium.
- Background:
  - Default: transparent.
  - Hover: background gets 10% blue tint.
- Spacing:
  - `margin-right: 6px`, `margin-bottom: 6px`.

Behavior:

- Click:
  - Either inserts a template into the input (e.g., “Search by department: ”), or
  - Immediately triggers a search pattern (your code decides, but UI must support both).
- Press effect:
  - Slight scale down `scale(0.97)` during press.

***

### 5.4 Input bar

Visual:

```text
[+]  [ Type doctor name…                     ]  [→]
```

Components:

1. Left button (optional add/attachment):
   - 36×36px circle.
   - Icon: “+” or attachment icon.
   - Background: transparent.
   - Hover: light gray background.

2. Input field:
   - Height: 40px.
   - Border-radius: 24px.
   - Background:
     - Light: `#E9ECEF` or similar soft gray.
     - Dark: `#2C2C2E`.
   - Border: none.
   - Padding: `0 16px`.
   - Placeholder: `"Type doctor name..."`.
   - Font: 15px.
   - Focus:
     - Subtle ring with accent color.
     - No thick default outline.

3. Send button:
   - 40×40px circle.
   - Background: primary blue.
   - Icon: arrow/paper plane (white).
   - Disabled state:
     - When input is empty: 50% opacity, pointer-events disabled.
   - Hover:
     - Slight brightness increase.
   - Active:
     - `transform: scale(0.95)` briefly.

Behavior:

- Enter key and button click both send.
- After sending:
  - Input is cleared.
  - Focus stays on input.
- On mobile:
  - Keyboard appears anchored to input; layout should still be stable.

Accessibility:

- Input: `aria-label="Search for a doctor by name"`.
- Send button: `aria-label="Send message"`.

***

### 5.5 Typing indicator

Shown between user message and bot response, while the app is searching.

Content:

- Bot bubble with three dots:

```text
[ ● ● ● ]
```

Styling:

- Same base as bot bubble.
- Inside: 3 dots (6px circles), horizontally spaced.

Animation:

- Dot 1: alpha 0.3 → 1 → 0.3 over 600ms.
- Dot 2: same, but 150ms delay.
- Dot 3: same, but 300ms delay.
- Loops while searching.
- Hidden once bot response is ready.

***

### 5.6 Empty state

Only shown when there are **no messages yet**.

Visual (centered):

- Emoji: 🎓 (48px) or a small mascot illustration.
- Title: “HTU Computing Directory”
- Description: “Search for instructors by name, department, or office.”

Alignment:

- Vertical and horizontal center of the chat card.
- Once first message appears, empty state fades out and is never shown again in that session.

***

## 6. Animations & motion

### 6.1 Message entrance

For both user and bot messages:

- Start: `opacity: 0`, `translateY(8px)`.
- End: `opacity: 1`, `translateY(0)`.
- Duration: ~200–250ms.
- Easing: `ease-out`.
- Triggered when a message is added to the list.

### 6.2 Typing dots

As described: 3-dot bouncing/fading loop. If using an animation library like Motion/Framer, use variants; if using CSS, use keyframes and delays.

### 6.3 Quick reply press

On `:active` or pointer down:

- `transform: scale(0.97)`.
- Background tinted slightly with primary color.
- Duration: ~100ms.

### 6.4 Theme toggle

When toggling theme:

- Icon rotates 180 degrees.
- Duration: ~300ms.
- Easing: `cubic-bezier(0.4, 0, 0.2, 1)`.

Do not animate the entire screen; only the icon and maybe a subtle background fade.

### 6.5 Scroll to last message

After every new bot or user message:

```js
messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
```

This ensures new messages are visible.

### 6.6 Reduced motion

If the user has `prefers-reduced-motion: reduce`:

- Disable message entrance animations (set duration to ~1ms or skip).
- Disable typing dot bounces (keep them static if needed).
- Disable icon rotation and quick reply scale.

***

## 7. Interaction logic (high level)

### 7.1 Basic search flow

1. User types a query (e.g., “Israa”).
2. User sends message.
3. System appends a **user** message to chat.
4. Typing indicator bubble appears (bot).
5. Fuse.js runs search over `doctors.json`.
6. If results found:
   - Bot bubble with doctor info appears.
7. If no results:
   - Bot bubble: `"I couldn't find any instructors matching '[query]'. Try checking the spelling or browse by department."`
8. Quick replies may appear to guide next steps.
9. Chat auto-scrolls down.

### 7.2 Multi-turn conversation example

Sequence:

- Welcome:
  - MubxBot:  
    > "Hi! 👋 I can help you find HTU computing instructors. Try typing a name like 'Israa' or a department like 'Cyber Security'."
  - Quick replies: `[Search name]` `[By department]` `[Office hours]`

- User: “Israa”
- Bot: Returns doctor info for Israa.
- Then: Quick replies: `[Search another]` `[Office hours only]`.

- If user clicks `[Office hours only]`:
  - Bot: `"Whose office hours? Type a name."`

The exact quick-reply logic implementation is flexible, but the UI must support this style.

***

## 8. Accessibility & responsiveness

### 8.1 Accessibility

- All interactive elements must be reachable by keyboard.
- Focus rings must be visible (e.g., 2px ring in accent color).
- ARIA labels:
  - Input: `aria-label="Search for a doctor by name"`.
  - Send button: `aria-label="Send message"`.
  - Theme toggle: `aria-label="Toggle light and dark theme"`.
  - Email link: `aria-label="Send email to [doctor name]"`.
- Ensure text contrast meets WCAG 2.1 AA (4.5:1 for standard text).

### 8.2 Responsive rules

CSS/media query guidelines:

- **Mobile (<768px):**
  - Full-screen chat.
  - Font-size: 15px base.
  - Header and input pinned.

- **Tablet (768–1023px):**
  - Chat card width ~90% of screen, max 480px.
  - Centered horizontally.

- **Desktop (≥1024px):**
  - Chat card max-width ~480px, centered with margin.
  - Font-size can be increased to 16px for readability.
  - Hover states more visible.

***

## 9. Content & copy (exact text)

Use these exact strings (except `[query]` and `[name]` placeholders):

- Bot name: **MubxBot**
- Welcome:
  > "Hi! 👋 I can help you find HTU computing instructors. Try typing a name like 'Israa' or a department like 'Cyber Security'."
- No results:
  > "I couldn't find any instructors matching '[query]'. Try checking the spelling or browse by department."
- Error loading data:
  > "Oops! I'm having trouble loading instructor data. Please refresh the page or try again later."

Tone rules:

- Use contractions (“I’m”, “you’ll”).
- Avoid slang.
- Never be rude or sarcastic.
- Offer next steps whenever possible.

***

## 10. Implementation hints (optional but recommended)

These are suggestions for the dev/AI; still must follow visual spec.

- Use React with state:
  ```js
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  ```
- Each message:
  ```js
  {
    id: string,
    sender: "user" | "system",
    content: ReactNode,
    timestamp: Date
  }
  ```
- Fuse.js for fuzzy search:
  - threshold: 0.3
  - keys: `["name", "department", "school", "email", "office"]`
- After initial data load:
  - Add welcome message from MubxBot.

***

## 11. Final instructions to the AI / developer

- Treat this document as **the only source of truth** for the chat design.
- Do not:
  - Change names, colors, sizes, or layout principles unless explicitly allowed.
  - Add new features or flows outside this spec.
  - Invent new copywriting or extra bot messages beyond what’s logical from this spec.
- Do:
  - Implement exactly this structure and styling.
  - Ask for clarification (or assume the simplest Apple-like solution) only where absolutely necessary.

This is the **final, fully detailed design spec** for the MubxBot chat UI.