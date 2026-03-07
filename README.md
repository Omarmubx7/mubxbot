# MubxBot 🤖

**MubxBot** is an AI-powered chatbot assistant for the HTU (Hashemite University) School of Computing and Informatics. It helps students instantly find instructor information — office hours, contact details, office locations — through a natural-language chat interface.

---

## What Does It Do?

Students can ask MubxBot questions like:

- *"When is Dr. Murad available?"*
- *"What is Dr. Razan's email?"*
- *"Where is Dr. Ahmad's office?"*
- *"Can I meet Dr. Murad on Tuesday afternoon?"*

The bot searches a structured database of faculty information (extracted from official PDF schedules) and responds conversationally using OpenAI GPT. If no AI key is configured it falls back to structured search results.

---

## Features

- 🔍 **Fuzzy search** — finds instructors even with partial or misspelled names (powered by [Fuse.js](https://fusejs.io/))
- 🤖 **AI-powered responses** — natural language answers via OpenAI GPT-4o-mini
- 📅 **Office hours lookup** — filter by day or time slot
- 📧 **Contact info** — emails and office room numbers
- 💬 **Disambiguation** — when multiple professors match, the bot asks which one you meant
- 🌓 **Dark / Light mode** — theme toggle with localStorage persistence
- 📱 **Mobile-first** — responsive, iMessage-style chat UI
- 🔄 **Automated data sync** — GitHub Actions re-parses faculty PDFs every Sunday and commits updated JSON

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 15](https://nextjs.org/) (App Router) |
| UI | React 19, Tailwind CSS 4, Framer Motion |
| Icons | Lucide React |
| Search | [Fuse.js](https://fusejs.io/) (fuzzy matching) |
| AI | [OpenAI API](https://platform.openai.com/) (GPT-4o-mini) |
| PDF parsing | Python + PyMuPDF (`fitz`) |
| Scheduling | node-cron |
| Analytics | Vercel Analytics |
| Email | Nodemailer |

---

## Project Structure

```
mubxbot/
├── app/
│   ├── api/
│   │   ├── chat/route.js        # POST /api/chat – search & AI response
│   │   └── doctors/route.js     # GET  /api/doctors – faculty data
│   ├── layout.js
│   └── page.js                  # Chat UI
├── components/                  # React UI components (ChatWindow, ChatInput, …)
├── lib/
│   └── getOfficeHours.js        # Core search & response logic
├── data/
│   ├── office_hours.json        # Parsed faculty data
│   └── raw/                     # Source PDFs
├── public/
│   └── doctors.json             # Normalized faculty directory
├── scripts/
│   ├── parse_office_hours.py    # Extract data from PDFs
│   ├── generate_doctors_json.py # Build normalized JSON
│   └── watcher.js               # Dev file watcher
└── .github/workflows/
    └── sync-office-hours.yml    # Weekly data sync CI
```

---

## Getting Started

### Prerequisites

- **Node.js** 18 or later
- **npm**
- **Python 3.11+** (only needed if you want to re-parse PDF data)
- An **OpenAI API key** (optional — the bot works without it using structured search)

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/Omarmubx7/mubxbot.git
cd mubxbot

# 2. Install Node dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local   # or create .env.local manually
```

Add the following to `.env.local`:

```env
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-4o-mini
```

```bash
# 4. Start the development server
npm run dev
# → http://localhost:3000
```

### Build for Production

```bash
npm run build
npm start
```

### Lint

```bash
npm run lint
```

---

## API Endpoints

### `POST /api/chat`

Accepts a natural language message and returns instructor information.

**Request body:**
```json
{ "message": "When is Dr. Murad available?" }
```

**Response types:** `smart_response`, `disambiguation`, `office_hours`, `no_results`

### `GET /api/doctors`

Returns the full list of instructors with normalized office hours.

---

## Data Pipeline

Faculty office-hour information is stored as PDFs in `data/raw/`. The data pipeline works as follows:

1. `scripts/parse_office_hours.py` — extracts structured data from PDFs using PyMuPDF
2. `scripts/generate_doctors_json.py` — normalizes and generates `data/office_hours.json` and `public/doctors.json`
3. A **GitHub Actions** workflow (`sync-office-hours.yml`) runs these scripts every Sunday at 3 AM (Amman time) and auto-commits any changes

To run the pipeline manually:

```bash
pip install pymupdf
python scripts/parse_office_hours.py
python scripts/generate_doctors_json.py
```

---

## Deployment

MubxBot is designed for [Vercel](https://vercel.com/). Just connect the repository and add `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`) as environment variables in the Vercel dashboard.

---

## License

This project is intended for use by HTU School of Computing and Informatics students and staff.
