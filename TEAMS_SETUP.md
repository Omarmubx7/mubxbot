# Adding Teams URLs to Faculty Office Hours

## Overview
This system efficiently adds Teams chat links to faculty office hours data, allowing students to quickly reach professors via Teams.

## Workflow

### Step 1: Populate the Teams Mapping File
Edit `scripts/teams_mapping.csv` and add Teams URLs for each faculty member:

```csv
email,teams_url
ashar.khamaiseh@htu.edu.jo,https://teams.microsoft.com/l/chat/0/conversation/019:xyz123@thread.tacv2
batool.alarmouti@htu.edu.jo,https://teams.microsoft.com/l/chat/0/conversation/019:abc456@thread.tacv2
```

**How to find a faculty member's Teams URL:**
1. Open Microsoft Teams
2. Click on the person's name or profile
3. Select "Start a chat" or "View profile"
4. Copy the URL from the browser address bar
5. Paste it in the mapping file

**Alternative:** If you have a Teams Admin account, you can export user IDs in bulk from Teams admin center.

### Step 2: Run the Update Script
```bash
cd scripts
python add_teams_urls.py
```

**Output:**
- ✓ Updates `data/office_hours.json` with `teams_url` field
- ✓ Reports how many URLs were added
- ✓ Lists missing URLs that still need to be added

### Step 3: Verify in Chat UI
The Teams button will automatically appear in chat messages with office hours information when a `teams_url` is present.

## Data Schema

Each office hours entry now includes:
```json
{
  "faculty": "As'har Khamaiseh- أسحار",
  "department": "Cyber Security",
  "email": "ashar.khamaiseh@htu.edu.jo",
  "office": "S-311",
  "day": "Saturday",
  "start": "8:30",
  "end": "10:00",
  "type": "In-Person",
  "teams_url": "https://teams.microsoft.com/l/chat/0/conversation/..."
}
```

## Frontend Integration

The `TeamsButton` component is used to display Teams chat links:

```tsx
import { TeamsButton } from '@/components/teams-button';

// In your office hours display component:
<TeamsButton 
  teamsUrl={officeHour.teams_url} 
  facultyName={officeHour.faculty}
/>
```

## Bulk Import (Advanced)

If you have Teams URLs in another format, modify `scripts/add_teams_urls.py` to parse your data source and generate the CSV mapping file.

## Troubleshooting

### URLs not appearing in UI?
- Check that office_hours.json has valid `teams_url` values
- Verify the frontend component is imported correctly
- Check browser console for errors

### Teams URLs expired or changed?
- Re-run the script with updated `teams_mapping.csv`
- The script will overwrite old URLs with new ones

## Files
- `scripts/add_teams_urls.py` - Main update script
- `scripts/teams_mapping.csv` - Email to Teams URL mapping
- `data/office_hours.json` - Updated faculty data
- `App Development/src/app/components/teams-button.tsx` - UI component
