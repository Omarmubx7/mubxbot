# MUBXBot

MUBXBot is a Next.js chatbot for HTU students to quickly find instructor details for the School of Computing and Informatics.

It helps users get:
- Instructor contact information
- Office locations
- Office hours and availability
- Department-based browsing

## What This Bot Does

MUBXBot uses deterministic search over local office-hours data. It does not rely on generative answers for the core lookup flow.

Main behaviors:
- Name search with typo tolerance (Fuse.js)
- Structured responses for questions like:
	- "What is X email?"
	- "Where is X office?"
	- "When is X free on Monday?"
- Disambiguation when multiple instructors match
- Closest-name suggestions when no exact match is found
- Frontend quick replies for common lookup actions

## Tech Stack

- Next.js (App Router)
- React
- Tailwind CSS
- Fuse.js (fuzzy search)
- Node.js runtime for API routes
- Python scripts for data cleanup and generation

## Project Structure

Key paths:
- `app/page.js`: Main chatbot UI
- `app/api/chat/route.js`: Chat API endpoint (`POST` and `GET`)
- `app/api/doctors/route.js`: Aggregated doctors endpoint (`GET`)
- `components/Providers.jsx`: Loads instructors from `/api/doctors` and manages theme
- `lib/getOfficeHours.js`: Search, token normalization, context extraction, and response shaping
- `data/office_hours.json`: Source dataset (slot-level records)
- `public/doctors.json`: Aggregated output dataset
- `scripts/generate_doctors_json.py`: Builds `public/doctors.json` from source data
- `scripts/cleanup_data.py`: Normalizes names, departments, and schedule formatting

## API Endpoints

### POST `/api/chat`

Accepts:
```json
{
	"message": "dr razan email"
}
```

Returns one of these response types:
- `smart_response`: single confident match with direct answer
- `disambiguation`: several close matches, asks user to choose
- `office_hours`: list of matched records
- `no_results`: no exact match, includes suggestions and guidance
- `help`: generic fallback guidance

### GET `/api/chat`

Returns basic dataset metadata (count, names, last updated if available).

### GET `/api/doctors`

Returns aggregated instructor records in this shape:
```json
[
	{
		"name": "Instructor Name",
		"department": "Computer Science",
		"email": "name@htu.edu.jo",
		"office": "S-321",
		"office_hours": {
			"Monday": "10:00 AM - 11:00 AM"
		}
	}
]
```

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Run development server

```bash
npm run dev
```

Default local URL:
- `http://localhost:3000`

### 3. Build for production

```bash
npm run build
npm run start
```

## Data Pipeline

The bot reads data from `data/office_hours.json` and groups rows by faculty name.

Recommended workflow when data changes:

1. Normalize and clean source data:
```bash
python scripts/cleanup_data.py
```

2. Regenerate public aggregated data:
```bash
python scripts/generate_doctors_json.py
```

## Search Logic Summary

`lib/getOfficeHours.js` includes:
- Query normalization (removes titles like Dr/Prof/Eng)
- Stopword filtering and alias expansion (`ahmad` <-> `ahmed`, etc.)
- Exact and strict token matching
- Fuzzy ranking using Fuse.js
- Query intent extraction (hours/email/office/day)
- Smart response generation by intent

## Environment and Secrets

- Do not commit `.env`.
- Keep API keys and tokens in environment variables only.
- `.env` is now gitignored in this repo.

## Current Notes

- Admin dashboard and admin auth routes were removed from this codebase.
- The current bot is student-facing lookup only.
- `package.json` currently contains a `parse` script pointing to `scripts/parse.js`, but that file is not present. Use the Python scripts in `scripts/` for data preparation.

## Troubleshooting

### Push blocked by secret scanning

If GitHub blocks `git push` because of secrets:
- Remove secrets from tracked files and commit history being pushed.
- Ensure `.env` is ignored.
- Re-commit and push again.

### Missing or empty results

- Confirm `data/office_hours.json` contains valid rows.
- Restart dev server after major data updates.
- Test endpoint directly:
```bash
curl -X POST http://localhost:3000/api/chat \
	-H "Content-Type: application/json" \
	-d "{\"message\":\"murad yaghi\"}"
```

## License

This project is for educational/internal university use unless a separate license is added.
