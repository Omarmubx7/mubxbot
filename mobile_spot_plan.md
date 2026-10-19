# 📱 MUBXBot — Mobile Spot (Scenes-Only File)

> **New file:** `scenes/mobile.html` — a standalone 9:16 (1080×1920) composition
> focused entirely on the **iPhone mockup + bot interface** demo.
> No narration, no music. Sound effects only. ~20 seconds.

---

## Visual Identity (carried from `index.html`)

| Token | Value |
|---|---|
| Background | `#09090b` + subtle purple-red radial gradient |
| Grid overlay | `rgba(255,255,255,0.02)` 60 px |
| Accent | `#ef4444` red glow |
| Phone shell | Titanium dark gradient, 2 px border |
| Screen chrome | Dynamic Island, iOS status bar |
| Font | Inter (local woff2) |

---

## Scene Plan — 5 Mobile-Only Scenes (~20 s total)

### Scene A — `0.0 → 3.5s` · **Arrive**
The iPhone materialises from black, rotating 3-D (CSS `perspective + rotateY`).
It lands upright with a subtle spring. The Dynamic Island pulses.
**Caption pill:** *"Meet MUBXBot."*
**SFX:** `whoosh.wav` on entry (0.05 s).

---

### Scene B — `3.5 → 8.5s` · **Search that fails**
User types `dr. saleh alemaishat`. Typing-dots appear. Then a
red ⚠️ "I couldn't find that." bubble slides in.
Phone does a micro-shake. Caption changes.
**Caption A:** *"You need a professor."*
**Caption B:** *"The bot can't help."*
**SFX:** `tick.wav` × 4 (keystrokes), `chime_notfound.wav` (error).

---

### Scene C — `8.5 → 13.5s` · **Update flow**
Phone tilts back to zero — the same query now returns a
green-bordered result card (`Dr. Saleh Alemaishat ✓`).
User taps **Update**. The bottom sheet slides up with the form.
Fields tick in one by one. **Submit** pulses.
**Caption:** *"Search → Tap Update → Fill → Submit."*
**SFX:** `tap.wav` × 2 (Update tap + Submit tap), `toast.wav` (sent).

---

### Scene D — `13.5 → 18.0s` · **Add new / flag**
Phone flips 3-D to reveal the **Add new** tab.
"Most searched — help these first 🔥" list cascades in.
Dr. Lina Obeidat has a red **Missing** pill that pulses.
**Caption:** *"Or add someone entirely new."*
**SFX:** `whoosh.wav` (flip), `tap.wav` (pill pulse).

---

### Scene E — `18.0 → 20.5s` · **CTA lock-up**
Phone rises, scales down slightly to sit beside the URL badge.
`bot.mubx.dev` fades in bold.
The QR scanline sweeps twice. Phone glows red.
**Caption:** *"One tap. Real data. For everyone."*
**SFX:** `toast.wav` (soft, 0.5× volume) as URL appears.

---

## 3-D iPhone Technique

```css
/* Applied to .phone-wrapper */
perspective: 2400px;
transform-style: preserve-3d;

/* Entry keyframe */
@keyframes phone-arrive {
  0%   { transform: rotateY(-35deg) rotateX(10deg) scale(0.85); opacity: 0; }
  60%  { transform: rotateY(4deg)   rotateX(-2deg) scale(1.02); opacity: 1; }
  100% { transform: rotateY(0deg)   rotateX(0deg)  scale(1);    opacity: 1; }
}

/* Flip between Scene C→D */
@keyframes phone-flip {
  0%   { transform: rotateY(0deg);  }
  50%  { transform: rotateY(90deg); }   /* swap content mid-flip */
  100% { transform: rotateY(0deg);  }
}
```

Side rails and button nubs are rendered as pure CSS `::before` / `::after` — no images required. A `box-shadow` stack produces the titanium edge catch.

---

## Audio Plan

| Element | File | Timing |
|---|---|---|
| Entry whoosh | `sfx/whoosh.wav` | 0.05 s |
| Typing ticks (×4) | `sfx/tick.wav` | 4.2, 4.45, 4.7, 4.95 s |
| Not-found chime | `sfx/chime_notfound.wav` | 7.80 s |
| Update tap | `sfx/tap.wav` | 10.40 s |
| Submit tap | `sfx/tap.wav` | 11.90 s |
| Sent toast | `sfx/toast.wav` | 12.20 s |
| Flip whoosh | `sfx/whoosh.wav` | 13.55 s |
| Flag tap | `sfx/tap.wav` | 15.30 s |
| CTA toast | `sfx/toast.wav` at 50% vol | 18.80 s |

**No music bed.** Silence is premium.

---

## Implementation Notes

- File: `scenes/mobile.html` — registered on `window.__timelines["mubx-mobile"]`
- `data-composition-id="mubx-mobile"`, `data-duration="20.5"`, `data-width="1080"`, `data-height="1920"`
- All SFX via `<audio data-start="…">` per HyperFrames convention
- All scene elements get `data-start` + `data-duration` + `class="clip scene"`
- GSAP `fromTo` for all entrance/exit animations; CSS `@keyframes` only for the 3-D phone spin (deterministic, no JS Date/random)
- Full `npm run check` before delivery

---

> ✅ **Ready to build.** Confirm and I'll write `scenes/mobile.html` now.
