# Teams Button Integration Guide

## How It Works

**Workflow:**
1. User asks chatbot about faculty office hours
2. Chatbot shows office hours with **"Open in Teams"** button
3. User clicks the button
4. Teams opens in a new tab with the faculty email pre-searched
5. User clicks on the faculty name to start a chat

## No Setup Needed!

You don't need to:
- ❌ Collect Teams URLs ahead of time
- ❌ Run Python scripts
- ❌ Manage a mapping file

Just use the faculty **email address** directly! 🎯

## Components Created

### 1. TeamsButton Component
**File:** `App Development/src/app/components/teams-button.tsx`

Takes email, automatically opens Teams search:
```tsx
import { TeamsButton } from '@/components/teams-button';

<TeamsButton email="ashar.khamaiseh@htu.edu.jo" facultyName="As'har Khamaiseh" />
```

### 2. OfficeHoursDisplay Component
**File:** `App Development/src/app/components/office-hours-display.tsx`

Full office hours card with integrated Teams button:
```tsx
import { OfficeHoursDisplay } from '@/components/office-hours-display';

<OfficeHoursDisplay 
  officeHours={officeHoursList}
  faculty="As'har Khamaiseh"
  email="ashar.khamaiseh@htu.edu.jo"
/>
```

## Integration Examples

### Example 1: In Chat Message

```tsx
import { OfficeHoursDisplay } from '@/components/office-hours-display';

export function ChatMessage({ content }) {
  // If content is office hours data
  if (content.type === 'office_hours') {
    return (
      <OfficeHoursDisplay 
        officeHours={content.hours}
        faculty={content.faculty}
        email={content.email}
      />
    );
  }
  
  return <p>{content.text}</p>;
}
```

### Example 2: Standalone Usage

```tsx
import { TeamsButton } from '@/components/teams-button';

export function FacultyCard({ faculty }) {
  return (
    <div className="flex justify-between items-center p-4 border rounded">
      <div>
        <h3>{faculty.name}</h3>
        <p>{faculty.email}</p>
      </div>
      <TeamsButton email={faculty.email} facultyName={faculty.name} />
    </div>
  );
}
```

## API Response Format

Your chatbot can return office hours like this:

```json
{
  "type": "office_hours",
  "faculty": "As'har Khamaiseh- أسحار",
  "email": "ashar.khamaiseh@htu.edu.jo",
  "department": "Cyber Security",
  "hours": [
    {
      "day": "Saturday",
      "start": "8:30",
      "end": "10:00",
      "office": "S-311",
      "type": "In-Person"
    },
    {
      "day": "Sunday",
      "start": "10:00",
      "end": "11:00",
      "office": "S-311",
      "type": "In-Person"
    }
  ]
}
```

## How Teams URL Works

When user clicks the button:

```
Step 1: User clicks "Open in Teams"
   ↓
Step 2: Opens: https://teams.microsoft.com/_#/search/ashar.khamaiseh@htu.edu.jo
   ↓
Step 3: Teams shows search results for that email
   ↓
Step 4: User clicks on the faculty member's name
   ↓
Step 5: Chat opens with that person!
```

## No Database Changes Needed

You don't need to modify `office_hours.json` - it still works as-is!

The button reads directly from the `email` field that's already there.

## Customization

### Customize Button Appearance

Edit `teams-button.tsx`:

```tsx
<Button
  onClick={handleTeamsClick}
  variant="outline"  // Change to "default", "destructive", etc.
  size="sm"          // Change to "lg", "xl"
  className="gap-2 text-blue-600 hover:bg-blue-50"  // Customize colors
>
  <MessageCircle className="w-4 h-4" />
  <span>Open in Teams</span>
</Button>
```

### Change Button Text

```tsx
<span>Chat with {facultyName}</span>
// or
<span>Message on Teams</span>
// or
<span>Connect on Teams</span>
```

### Add More Information

Edit `office-hours-display.tsx` to show additional fields like:
- Department
- Building/Floor
- Phone number
- Website link

## Testing

Open your app and:
1. Request office hours for a faculty member
2. Click the "Open in Teams" button
3. Teams should open and search for that faculty email
4. You should see the faculty member in search results

## Files Location

- `App Development/src/app/components/teams-button.tsx` - Button component
- `App Development/src/app/components/office-hours-display.tsx` - Full office hours card
- No database/JSON changes needed!

## Done! 🎉

Users can now click a button and directly access faculty members on Teams - all automated from the email address!
