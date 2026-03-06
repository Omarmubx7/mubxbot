# Product Requirements Document (PRD)
## HTU Computing Doctors Directory - Chat Interface & Admin Dashboard

**Version:** 1.0  
**Date:** March 1, 2026  
**Product Owner:** CS Student, HTU  
**Target Launch:** Q2 2026  
**Status:** Pre-Development

***

## 1. Executive Summary

### 1.1 Product Overview
A modern, dual-interface web application that allows HTU students to quickly search for School of Computing instructors via an intuitive chat interface, while providing university administrators with a comprehensive CRUD dashboard to manage instructor data.

### 1.2 Problem Statement
**Current Pain Points:**
- Students struggle to find instructor information quickly (office hours, locations, emails)
- Information is scattered across multiple PDFs, websites, and bulletin boards
- No mobile-friendly interface for on-the-go lookups
- Manual data management creates outdated information
- No centralized system for admin updates

**Impact:**
- Students miss office hours
- Email inquiries go to wrong addresses
- Time wasted searching multiple sources
- Admin burden updating multiple locations

### 1.3 Solution
A single-page application (SPA) with:
1. **Student Chat Interface** - iMessage-style chatbot for instant instructor lookup
2. **Admin Dashboard** - Full CRUD interface for data management
3. **Unified Data Source** - Single source of truth for all instructor information

### 1.4 Success Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| Student adoption | 60% of CS students in first semester | Analytics tracking |
| Search success rate | >90% of queries return results | Search analytics |
| Average search time | <10 seconds from query to info | Time tracking |
| Admin update frequency | Weekly updates | Activity logs |
| Mobile usage | >70% of traffic | Device analytics |

### 1.5 Non-Goals (Out of Scope for V1)
- Real-time availability status
- Appointment booking system
- Multi-language support (Arabic/English)
- Voice input
- Integration with university LMS
- Student authentication/login
- Backend database (client-side only for V1)

***

## 2. User Personas

### 2.1 Primary Persona: Sara - The CS Student

**Demographics:**
- Age: 19-22
- Year: 2nd-4th year CS student
- Tech-savvy, mobile-first user
- Uses iPhone or Android device

**Goals:**
- Find instructor office hours quickly between classes
- Get email addresses to ask questions
- Locate instructor offices for meetings
- Check who teaches specific courses

**Pain Points:**
- PDFs are hard to search on mobile
- Information often outdated
- No time to browse long lists
- Needs instant answers

**Usage Context:**
- Between classes on campus
- At home doing assignments
- In library preparing for meetings
- Late night when working on projects

**Quote:** *"I just need to know if Dr. Saadeh is in her office today, I don't want to dig through a PDF."*

***

### 2.2 Secondary Persona: Ahmad - The Department Admin

**Demographics:**
- Age: 28-45
- Role: Department secretary or coordinator
- Moderate technical skills
- Works on desktop PC

**Goals:**
- Update instructor information quickly
- Ensure student-facing data is accurate
- Add new instructors when hired
- Remove or archive departed faculty

**Pain Points:**
- Updating multiple systems is tedious
- Mistakes in manual data entry
- No easy way to verify current data
- Time-consuming to maintain lists

**Usage Context:**
- Office desktop during work hours
- Beginning of each semester (heavy updates)
- Ad-hoc updates as changes occur
- Monthly data verification

**Quote:** *"I need a single place to update instructor info that immediately reflects to students."*

***

## 3. Feature Requirements

### 3.1 Student Chat Interface

#### 3.1.1 Search & Query (P0 - Critical)

**User Story:**  
*As a student, I want to search for instructors by name so I can quickly find their information.*

**Acceptance Criteria:**
- ✓ User can type instructor name (full or partial)
- ✓ Fuzzy search tolerates typos (e.g., "Isra" finds "Israa")
- ✓ Search works on: name, department, school, email, office
- ✓ Results appear within 1 second
- ✓ Top match is always shown first
- ✓ "No results" message for unmatched queries

**Technical Notes:**
- Use Fuse.js with threshold: 0.3
- Search keys: `["name", "department", "school", "email", "office"]`

**Edge Cases:**
- Empty query → show prompt to type something
- Special characters → sanitize and search
- Multiple matches → return top 1 result only

***

#### 3.1.2 Display Instructor Information (P0 - Critical)

**User Story:**  
*As a student, I want to see complete instructor details so I know how to contact them and when they're available.*

**Acceptance Criteria:**
- ✓ Display full name
- ✓ Display school name
- ✓ Display department
- ✓ Display office location (building + room)
- ✓ Display email as clickable mailto link
- ✓ Display office hours by day and time
- ✓ Information is readable on mobile screens

**Data Format:**
```json
{
  "name": "Israa Ibrahim Saadeh",
  "school": "School of Computing and Informatics",
  "department": "Cyber Security",
  "email": "israa.hasan@htu.edu.jo",
  "office": "S-321",
  "office_hours": {
    "Monday": "11:30 PM – 12:30 PM",
    "Tuesday": "2:30 PM – 3:30 PM",
    "Thursday": "11:30 AM – 12:30 PM"
  }
}
```

***

#### 3.1.3 Chat UX & Interaction (P0 - Critical)

**User Story:**  
*As a student, I want a familiar chat interface so I can interact naturally without learning a new system.*

**Acceptance Criteria:**
- ✓ Chat bubbles: user messages on right (blue), bot on left (gray)
- ✓ Welcome message on first load
- ✓ Text input bar fixed at bottom
- ✓ Send button or Enter key submits query
- ✓ Auto-scroll to latest message
- ✓ Timestamps on messages
- ✓ Message entrance animation
- ✓ Typing indicator while searching

**Interaction Flow:**
1. User opens app → sees welcome message
2. User types "Israa" → presses Enter
3. User message appears on right
4. Typing indicator shows briefly
5. Bot reply appears on left with info
6. Chat scrolls to show full reply

***

#### 3.1.4 Quick Reply Suggestions (P1 - High Priority)

**User Story:**  
*As a student, I want suggested actions so I know what else I can do.*

**Acceptance Criteria:**
- ✓ Quick reply buttons appear below welcome message
- ✓ Buttons suggest common actions: "Search by name", "Search by department"
- ✓ Clicking a button inserts text or triggers action
- ✓ Buttons are touch-friendly (min 44×44px)

**Examples:**
- After welcome: `[Search name]` `[By department]` `[Office hours]`
- After result: `[Search another]` `[Email instructor]`

***

#### 3.1.5 Mobile-First Responsive Design (P0 - Critical)

**User Story:**  
*As a mobile student, I want the app to work perfectly on my phone so I can use it on campus.*

**Acceptance Criteria:**
- ✓ Full-screen layout on mobile (<768px)
- ✓ Fixed header and input bar
- ✓ Scrollable chat area in between
- ✓ Touch-friendly tap targets (44×44px minimum)
- ✓ Readable text sizes (15px minimum)
- ✓ No horizontal scrolling
- ✓ Works on iOS Safari and Chrome Android

**Desktop Enhancement (>768px):**
- ✓ Centered chat card (max 480px width)
- ✓ Visible page background
- ✓ Rounded corners and shadow on card
- ✓ Larger spacing and typography

***

#### 3.1.6 Light/Dark Theme Toggle (P1 - High Priority)

**User Story:**  
*As a user, I want to switch between light and dark modes so I can use the app comfortably in any lighting.*

**Acceptance Criteria:**
- ✓ Theme toggle button in header
- ✓ Switches between light and dark instantly
- ✓ Persists choice in localStorage
- ✓ Detects system preference on first load
- ✓ All UI elements adapt (bubbles, background, text)
- ✓ Maintains WCAG AA contrast ratios

**Color Requirements:**
- Light mode: white/gray backgrounds, dark text
- Dark mode: dark backgrounds, light text
- User bubbles: blue in both modes
- Bot bubbles: gray (light in light mode, dark in dark mode)

***

### 3.2 Admin Dashboard

#### 3.2.1 Authentication & Access (P2 - Medium Priority, V1 Simplified)

**V1 Approach:**  
No authentication - admin route is `/admin` accessible to anyone. (Future: add password protection)

**User Story:**  
*As an admin, I want to access the admin dashboard so I can manage instructor data.*

**Acceptance Criteria:**
- ✓ Navigate to `/admin` route
- ✓ Different UI from student chat
- ✓ Clear navigation between Chat and Admin views

**Future (V2):**
- Password-protected login
- Session management
- Role-based access

***

#### 3.2.2 View All Instructors (P0 - Critical)

**User Story:**  
*As an admin, I want to see all instructors in a table so I can review current data.*

**Acceptance Criteria:**
- ✓ Table with columns: Name, School, Department, Email, Office, Actions
- ✓ Displays all instructors from data source
- ✓ Responsive table (scrollable on mobile)
- ✓ Readable on desktop
- ✓ Shows count: "Showing X instructors"

**Table Design:**
- Striped rows for readability
- Fixed header on scroll
- Hover state on rows

***

#### 3.2.3 Create New Instructor (P0 - Critical)

**User Story:**  
*As an admin, I want to add a new instructor so students can find them in the chat.*

**Acceptance Criteria:**
- ✓ "Add Instructor" button above table
- ✓ Opens modal form with fields:
  - Name (required, text)
  - School (required, text)
  - Department (required, text)
  - Email (required, email validation)
  - Office (required, text)
  - Office Hours (object with day/time pairs)
- ✓ Validation on all required fields
- ✓ Email format validation
- ✓ "Cancel" and "Save" buttons
- ✓ On save: adds to data, closes modal, shows success
- ✓ On cancel: closes modal, no changes

**Office Hours Input:**
- Simple text inputs for common days (Monday-Friday)
- Format: "HH:MM AM/PM – HH:MM AM/PM"

**Validation Rules:**
- Name: min 3 characters
- Email: regex `^[^\s@]+@[^\s@]+\.[^\s@]+$`
- All required fields must be filled

***

#### 3.2.4 Update Instructor (P0 - Critical)

**User Story:**  
*As an admin, I want to edit instructor information so I can keep data current.*

**Acceptance Criteria:**
- ✓ "Edit" button in each table row
- ✓ Opens modal pre-filled with current values
- ✓ Same form fields as Create
- ✓ Same validation rules
- ✓ On save: updates data, closes modal, shows success
- ✓ Changes immediately reflect in chat search

**Edge Cases:**
- If student is currently viewing that instructor in chat → data updates live (or on next search)

***

#### 3.2.5 Delete Instructor (P0 - Critical)

**User Story:**  
*As an admin, I want to remove instructors who have left so students don't see outdated info.*

**Acceptance Criteria:**
- ✓ "Delete" button in each table row
- ✓ Shows confirmation dialog: "Are you sure you want to delete [Name]? This cannot be undone."
- ✓ "Cancel" and "Delete" options
- ✓ On confirm: removes from data, updates table
- ✓ On cancel: no action
- ✓ Deleted instructors no longer appear in chat search

**Safety:**
- Two-step confirmation (button + dialog)
- Clear warning message
- No accidental deletes

***

#### 3.2.6 Admin Layout & Navigation (P1 - High Priority)

**User Story:**  
*As an admin, I want a professional dashboard layout so I can work efficiently.*

**Acceptance Criteria:**
- ✓ Sidebar with navigation (current: "Instructors")
- ✓ Top bar with title "Admin Dashboard" + theme toggle
- ✓ Main content area for table/forms
- ✓ Responsive: sidebar collapses on mobile
- ✓ Clear link back to Chat view

**Design:**
- Clean, minimal, professional
- Consistent with chat app styling
- Tailwind-based admin UI

***

### 3.3 Shared Features

#### 3.3.1 Data Management (P0 - Critical)

**Architecture:**
- Single source of truth: React state at app level
- Initial load: fetch `/doctors.json` from public folder
- All CRUD operations update in-memory state
- Chat and Admin share same data state
- No backend writes in V1 (localStorage possible in V2)

**Data Flow:**
```
App.jsx
  └─ instructors state
      ├─ ChatPage (read-only)
      └─ AdminPage (read + write via callbacks)
```

***

#### 3.3.2 Routing (P0 - Critical)

**Routes:**
- `/` → Chat interface (student view)
- `/admin` → Admin dashboard

**Navigation:**
- Top nav bar with links: "Chat" | "Admin"
- React Router for client-side routing
- Browser back/forward support

***

#### 3.3.3 Theme System (P1 - High Priority)

**Shared Behavior:**
- Single theme state for entire app
- Applies to both Chat and Admin views
- Persists across route changes
- Tailwind `dark` class strategy

***

## 4. Technical Specifications

### 4.1 Tech Stack

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| Framework | React | 18.x | Modern, component-based, large ecosystem |
| Build Tool | Vite | 5.x | Fast dev server, optimized builds |
| Styling | Tailwind CSS | 3.x | Rapid UI development, consistent design |
| Routing | React Router | 6.x | Standard React routing solution |
| Search | Fuse.js | 6.6.x | Fuzzy search, lightweight, easy integration |
| Animation | Motion (Framer Motion) | Latest | Smooth animations, React-friendly |
| Language | JavaScript (ES6+) | - | Team familiarity, no TypeScript overhead for V1 |
| Deployment | Vercel/Netlify | - | Zero-config static hosting, free tier |

### 4.2 Project Structure

```
project-root/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── public/
│   └── doctors.json
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── index.css
│   ├── routes/
│   │   ├── ChatPage.jsx
│   │   └── AdminPage.jsx
│   ├── components/
│   │   ├── ChatWindow.jsx
│   │   ├── MessageBubble.jsx
│   │   ├── ThemeToggle.jsx
│   │   └── admin/
│   │       ├── AdminLayout.jsx
│   │       ├── InstructorsTable.jsx
│   │       └── InstructorFormModal.jsx
│   └── utils/
│       └── searchHelpers.js (if needed)
```

### 4.3 Data Schema

**Instructor Object:**
```typescript
{
  id?: string,              // Optional, can use array index
  name: string,             // Full name
  school: string,           // School name
  department: string,       // Department name
  email: string,            // Valid email
  office: string,           // Room/building code
  office_hours: {           // Object with day keys
    [day: string]: string   // "Monday": "10:00 AM - 12:00 PM"
  }
}
```

**Messages Object (Chat):**
```typescript
{
  id: string,               // Unique ID (timestamp or UUID)
  sender: "user" | "system",
  content: ReactNode,       // String or JSX
  timestamp: Date
}
```

### 4.4 API / Data Loading

**V1 (Static JSON):**
```javascript
// On app mount
fetch('/doctors.json')
  .then(res => res.json())
  .then(data => setInstructors(data))
  .catch(err => console.error(err));
```

**V2 (Future Backend):**
- RESTful API: GET, POST, PUT, DELETE `/api/instructors`
- Authentication headers
- Real-time updates via WebSocket (optional)

### 4.5 Search Configuration

```javascript
const fuseOptions = {
  includeScore: true,
  threshold: 0.3,           // 0 = exact, 1 = match anything
  keys: [
    "name",
    "department",
    "school",
    "email",
    "office"
  ]
};

const fuse = new Fuse(instructors, fuseOptions);
const results = fuse.search(query);
```

### 4.6 Performance Requirements

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Initial load | <2s on 3G | Lighthouse |
| Search response | <500ms | Console timing |
| Message render | <100ms | React DevTools |
| Bundle size | <200KB (gzipped) | Build output |
| Lighthouse score | >90 | Chrome DevTools |

### 4.7 Browser Support

**Target Browsers:**
- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- iOS Safari 14+
- Chrome Android (latest)

**Graceful Degradation:**
- Animations disabled on `prefers-reduced-motion`
- Fallback fonts if system fonts unavailable

### 4.8 Accessibility Requirements

**WCAG 2.1 Level AA Compliance:**
- ✓ Contrast ratio 4.5:1 for normal text, 3:1 for large text
- ✓ All interactive elements keyboard accessible
- ✓ Proper ARIA labels on inputs and buttons
- ✓ Focus indicators visible and distinct
- ✓ No keyboard traps
- ✓ Semantic HTML structure

**Screen Reader Support:**
- Tested with VoiceOver (iOS/Mac)
- Logical reading order
- Descriptive link text

***

## 5. User Flows

### 5.1 Student Search Flow (Happy Path)

```
1. Student opens app (/)
   ↓
2. Sees welcome message: "Hi! Type a doctor's name..."
   ↓
3. Types "Israa" in input box
   ↓
4. Presses Enter
   ↓
5. User message appears on right: "Israa"
   ↓
6. Typing indicator shows (300ms)
   ↓
7. Fuse.js searches instructors
   ↓
8. Bot message appears on left with:
   - Name: Israa Ibrahim Saadeh
   - Department: Cyber Security
   - Office: S-321
   - Email: israa.hasan@htu.edu.jo (clickable)
   - Office hours: Mon, Tue, Thu with times
   ↓
9. Student clicks email → opens mail app
   ↓
10. Student types another query or closes app
```

### 5.2 Student Search Flow (No Results)

```
1. Student types "xyz123"
   ↓
2. User message appears
   ↓
3. Typing indicator shows
   ↓
4. Fuse.js returns empty array
   ↓
5. Bot message: "No doctors found for 'xyz123'. Try:"
   - Quick replies: [Common names] [Browse by dept]
   ↓
6. Student clicks a quick reply or types again
```

### 5.3 Admin Create Instructor Flow

```
1. Admin navigates to /admin
   ↓
2. Sees table of all instructors
   ↓
3. Clicks "Add Instructor" button
   ↓
4. Modal opens with empty form
   ↓
5. Admin fills in:
   - Name: "Ahmad Salem"
   - School: "School of Computing and Informatics"
   - Department: "Software Engineering"
   - Email: "ahmad.salem@htu.edu.jo"
   - Office: "S-400"
   - Office hours: Monday 10-12, Wednesday 2-4
   ↓
6. Admin clicks "Save"
   ↓
7. Validation passes
   ↓
8. New instructor added to state
   ↓
9. Modal closes
   ↓
10. Table updates with new row
   ↓
11. Success message: "Instructor added successfully"
   ↓
12. (Student can now search for "Ahmad Salem" in chat)
```

### 5.4 Admin Update Instructor Flow

```
1. Admin sees instructor with outdated office
   ↓
2. Clicks "Edit" button in that row
   ↓
3. Modal opens pre-filled with current data
   ↓
4. Admin changes Office: "S-321" → "S-322"
   ↓
5. Admin clicks "Save"
   ↓
6. Validation passes
   ↓
7. Instructor object updated in state
   ↓
8. Modal closes
   ↓
9. Table refreshes
   ↓
10. Success message: "Instructor updated"
   ↓
11. (Chat searches now show new office)
```

### 5.5 Admin Delete Instructor Flow

```
1. Admin identifies instructor to remove
   ↓
2. Clicks "Delete" button
   ↓
3. Confirmation dialog appears:
   "Are you sure you want to delete Israa Ibrahim Saadeh? This cannot be undone."
   ↓
4. Admin clicks "Delete" (or "Cancel" to abort)
   ↓
5. Instructor removed from state
   ↓
6. Table updates (row disappears)
   ↓
7. Success message: "Instructor deleted"
   ↓
8. (Chat searches no longer find this instructor)
```

***

## 6. Non-Functional Requirements

### 6.1 Performance
- Initial page load: <2 seconds on 3G
- Search response: <500ms
- Smooth 60fps animations
- Bundle size: <200KB gzipped

### 6.2 Security
- No sensitive data exposed (emails are public university emails)
- No SQL injection risk (client-side only)
- XSS protection via React's JSX escaping
- HTTPS enforced on deployment
- No user authentication in V1 (admin open access)

### 6.3 Reliability
- No server dependency (static hosting)
- Graceful error handling (failed data load)
- Offline-friendly (once loaded, works without network)
- No data loss (admin changes in memory, future: persist)

### 6.4 Scalability
- V1: Up to 100 instructors (client-side search)
- V2: Backend with database for >100 instructors
- Search performance tested with 50+ entries

### 6.5 Maintainability
- Clean component structure
- Commented code where complex
- Consistent naming conventions
- Tailwind for easy style updates
- Version control (Git)

### 6.6 Usability
- <5 minute learning curve for students
- <10 minute learning curve for admin
- No training required
- Intuitive chat metaphor

***

## 7. Constraints & Assumptions

### 7.1 Constraints
- **No backend in V1**: All data in-memory, no persistence across sessions
- **No authentication**: Admin route is publicly accessible
- **Static hosting only**: Must deploy to Vercel/Netlify (no server code)
- **Client-side search**: Limited to ~100 instructors for performance
- **Single language**: English only (Arabic in V2)

### 7.2 Assumptions
- University provides initial `doctors.json` file
- Instructors' email addresses are public (not confidential)
- Students have modern smartphones (iOS 14+, Android 10+)
- Admin has desktop/laptop for data entry
- University IT allows external hosting (Vercel/Netlify)
- Data updates are infrequent (weekly, not hourly)

***

## 8. Dependencies & Integrations

### 8.1 External Dependencies
| Dependency | Purpose | Risk | Mitigation |
|------------|---------|------|------------|
| Fuse.js CDN/npm | Fuzzy search | CDN downtime | Use npm package, bundle locally |
| Tailwind CSS | Styling | Breaking changes | Lock version in package.json |
| React Router | Routing | API changes | Lock version |
| Motion (Framer Motion) | Animations | Bundle size | Tree-shake, lazy load if needed |

### 8.2 Integrations
- **V1**: None (standalone app)
- **V2 (Future)**:
  - University LDAP for authentication
  - Canvas LMS API for course-instructor mapping
  - Google Calendar API for real-time availability

***

## 9. Testing Requirements

### 9.1 Unit Testing
- Search logic (Fuse.js configuration)
- CRUD operations (add/edit/delete)
- Validation functions (email, required fields)
- Theme toggle logic

**Tool:** Jest + React Testing Library

### 9.2 Integration Testing
- Chat flow: query → search → display
- Admin flow: create → update → delete → chat reflects changes
- Router navigation between Chat and Admin

### 9.3 E2E Testing
- Student searches for instructor → clicks email
- Admin adds instructor → verifies in chat
- Theme toggle persists across routes

**Tool:** Playwright or Cypress

### 9.4 Manual Testing
- Cross-browser testing (Chrome, Safari, Firefox)
- Mobile device testing (iOS, Android)
- Accessibility audit (VoiceOver, keyboard navigation)

### 9.5 Acceptance Criteria
- All P0 features working
- No console errors
- Lighthouse score >90
- Passes WCAG AA automated checks

***

## 10. Launch Plan

### 10.1 Alpha (Internal)
**Target:** 2 weeks after dev start  
**Audience:** Developer + 2-3 CS student friends  
**Goals:**
- Validate core search works
- Test on multiple devices
- Fix critical bugs

### 10.2 Beta (Limited)
**Target:** 4 weeks after dev start  
**Audience:** 20-30 CS students + 1 admin  
**Goals:**
- Real usage data
- Admin workflow feedback
- Performance under load
- Gather feature requests

### 10.3 V1 Launch (Public)
**Target:** 6 weeks after dev start  
**Audience:** All HTU CS students (~500?)  
**Announcement:**
- Post in CS student WhatsApp groups
- Email to department mailing list
- Poster in CS building
- Social media (if allowed)

**Launch Checklist:**
- [ ] All P0 features complete
- [ ] Tested on 5+ devices
- [ ] Data reviewed by admin for accuracy
- [ ] Analytics setup (Google Analytics or similar)
- [ ] Support channel established (email or form)

### 10.4 Post-Launch
- Monitor analytics weekly
- Collect user feedback
- Fix bugs within 48 hours
- Plan V2 features based on usage

***

## 11. Success Criteria & KPIs

### 11.1 Launch Success (First Month)
- ✓ 60% of CS students use it at least once
- ✓ <5% bounce rate (users who leave immediately)
- ✓ Average session: >2 searches
- ✓ Zero critical bugs reported
- ✓ Admin updates data at least once per week

### 11.2 Ongoing KPIs
| KPI | Target | Frequency |
|-----|--------|-----------|
| Monthly Active Users (MAU) | 70% of CS students | Monthly |
| Search success rate | >90% | Weekly |
| Average search time | <10s | Weekly |
| Mobile vs Desktop | 70% mobile | Monthly |
| Admin activity | 1+ update/week | Weekly |
| Error rate | <1% | Daily |

### 11.3 User Satisfaction
- Post-use survey: "How helpful was this tool?" (1-5 scale)
- Target: 4.2+ average rating
- Collect feedback via in-app form or email

***

## 12. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Data becomes outdated** | High | Medium | Train admin to update weekly; add "Last updated" timestamp |
| **Poor search results** | Medium | High | Test Fuse.js thoroughly; adjust threshold; collect failed queries |
| **Low student adoption** | Medium | High | Market via WhatsApp groups; make URL memorable; add QR code posters |
| **Admin makes mistakes** | Medium | Medium | Add undo feature in V2; confirmation dialogs; backup data |
| **Performance issues** | Low | Medium | Test with 100+ instructors; optimize bundle size; lazy load |
| **Browser compatibility** | Low | Medium | Test on all target browsers; use Babel polyfills |
| **No mobile data** | Low | Low | App works offline after first load (PWA in V2) |

***

## 13. Future Roadmap (V2+)

### V2 (Q3 2026)
- Backend API + database for data persistence
- Admin authentication (password-protected)
- Search history for students
- "Favorite" instructors
- Export data as CSV (admin)
- Undo delete feature

### V3 (Q4 2026)
- Multi-language support (Arabic)
- Voice input for search
- Real-time office availability status
- Push notifications for office hour changes
- Integration with university calendar

### V4 (2027)
- Appointment booking system
- Student reviews/ratings (anonymous)
- Course-instructor mapping
- Mobile apps (iOS/Android native)

***

## 14. Open Questions

1. **Data ownership:** Who maintains `doctors.json` initially? Department secretary?
2. **Update frequency:** How often will admin realistically update data?
3. **Backup strategy:** Should we auto-backup data before admin deletes? (V2)
4. **Analytics privacy:** Do students need to consent to usage tracking?
5. **Branding:** Should this be co-branded with HTU logo/colors?
6. **Domain:** Will university provide subdomain (directory.htu.edu.jo) or use external?

***

## 15. Appendices

### 15.1 Glossary
- **CRUD**: Create, Read, Update, Delete
- **SPA**: Single-Page Application
- **Fuzzy search**: Search that tolerates typos and partial matches
- **P0/P1/P2**: Priority levels (0=critical, 1=high, 2=medium)
- **MAU**: Monthly Active Users
- **WCAG**: Web Content Accessibility Guidelines

### 15.2 References
- [Fuse.js Documentation](https://fusejs.io)
- [React Router Documentation](https://reactrouter.com)
- [Tailwind CSS Documentation](https://tailwindcss.com)
- [Sendbird Chatbot UI Best Practices](https://sendbird.com/blog/chatbot-ui)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

### 15.3 Contacts
- **Product Owner:** [Your Name], [Your Email]
- **Developer:** [Your Name]
- **Department Contact:** [Admin Name], [Admin Email]
- **Feedback Channel:** [Email or form URL]

***

## 16. Bug Report & Quality Assurance Findings

**Report Date:** March 6, 2026  
**Testing Phase:** Pre-Launch QA  
**Total Issues Found:** 18 (6 Critical/High, 3 Medium, 4 Data Quality, 8 UX Improvements)

### 16.1 Critical Severity Bugs (🔴 P0 - Blocking)

#### Bug #1 — Admin Dashboard Completely Blank/Inaccessible
**Status:** 🔴 BLOCKING - Must fix before launch  
**What happens:** Navigating to `/admin` shows a completely blank white/black page with no UI elements, no error messages, and no console errors. The entire admin dashboard is unusable.  
**PRD reference:** Section 3.2 — Admin Dashboard is a core V1 feature marked as P0 Critical.  
**Impact:** The "single source of truth" promise is broken — no one can manage instructor data.  
**Root cause:** Likely a React component crash, missing route configuration, or failed data load that silently fails.  
**Fix:**
- Investigate `/admin` route rendering in Next.js
- Check for component mount errors
- Add error boundaries around admin components
- Verify admin page exports and imports
- Add loading state and error message fallbacks

**Priority:** Fix immediately before any other work.

***

#### Bug #2 — Special Characters Bypass "No Results" and Return Full List
**Status:** 🔴 Critical - Security/UX issue  
**Input:** `!@#$%`  
**What happens:** Instead of a "no results" message, the bot replies "Found 36 professors" and shows the entire database. Fuse.js with special character inputs is treating the query as a wildcard match.  
**PRD reference:** Section 3.1.1 edge cases — "Special characters → sanitize and search."  
**Impact:** Users can dump entire database with nonsense queries; poor UX; potential data exposure.  
**Fix:**
- Sanitize input before passing to Fuse.js
- Strip or escape non-alphanumeric characters before search runs
- Add validation: if sanitized query is empty or below minimum length (e.g., 2 chars), return "please type a valid name" prompt
- Test with: `!@#$`, `???`, `***`, `...`, empty spaces

**Code example:**
```javascript
const sanitizeQuery = (query) => {
  const cleaned = query.replace(/[^a-zA-Z0-9\s]/g, '').trim();
  if (cleaned.length < 2) return null;
  return cleaned;
};

// Before search:
const cleanQuery = sanitizeQuery(userInput);
if (!cleanQuery) {
  return "Please type a valid instructor name (at least 2 letters).";
}
```

***

### 16.2 High Severity Bugs (🟠 P1 - Must Fix Before Launch)

#### Bug #3 — Quick Reply Buttons Fire as Literal Search Queries
**Status:** 🟠 High - Core UX broken  
**What happens:** Clicking "Search name", "By department", or "Office hours" sends the button label text as a real search query. "Search name" triggers a "no results" error for the literal string "Search name".  
**PRD reference:** Section 3.1.4 — "Clicking a button inserts text or triggers action" — it should guide the user, not search for the button label.  
**Impact:** Quick replies are currently worse than useless — they create confusion.  
**Fix:**
- Quick reply buttons need dedicated intent handlers, not `onSubmit(buttonLabel)`
- "Search name" → focus input and show placeholder prompt "Type an instructor's name..."
- "By department" → trigger department browser directly (show dept list)
- "Office hours" → show prompt: "Whose office hours would you like to see?"
- Do NOT send button labels as search queries

**Code pattern:**
```javascript
const handleQuickReply = (action) => {
  if (action === 'Search name') {
    inputRef.current?.focus();
    setPlaceholder("Type an instructor's name...");
  } else if (action === 'By department') {
    showDepartmentList();
  } else if (action === 'Office hours') {
    promptForInstructor();
  }
  // Do NOT call handleSendMessage(action)
};
```

***

#### Bug #4 — "Office Hours" Quick Reply Returns Hours With No Context
**Status:** 🟠 High - Confusing UX  
**What happens:** Clicking "Office hours" returns a list of times (e.g., "Monday: 1:00 PM – 1:30 PM") with zero indication of which instructor these belong to.  
**PRD reference:** Section 3.1.2 — display must include full name, department, and all details together.  
**Impact:** User sees times but has no idea whose schedule it is.  
**Fix:**
- "Office hours" intent needs to either:
  - Ask for a name first: "Whose office hours would you like to see?"
  - OR display the full instructor card along with the hours (not just the hours)
- Always include Name + Department + Office when showing office hours

***

#### Bug #5 — Theme Toggle Icon Broken After Click
**Status:** 🟠 High - Visible UI bug  
**What happens:** After clicking the theme toggle once, the moon/sun icon disappears and is replaced by a solid teal/cyan circle. The icon does not restore on subsequent clicks. This persists across both light and dark modes.  
**PRD reference:** Section 3.1.6 — "Theme toggle button in header."  
**Impact:** Users lose visual feedback; looks broken.  
**Root cause:** The ThemeToggle component likely has a conditional render that loses the SVG icon after first toggle. May be rendering a loading/animation state permanently.  
**Fix:**
- Check icon state logic in ThemeToggle component
- Ensure SVG icons (Sun/Moon from lucide-react) are always rendered
- Remove any loading state that doesn't clear
- Test toggle 5+ times in succession

***

#### Bug #6 — "+" Button Is a Dead UI Element
**Status:** 🟠 High - Misleading UX  
**What happens:** Clicking the "+" button in the input bar animates it into a teal circle but no action, menu, attachment panel, or any functionality appears. It is purely decorative and misleads users.  
**PRD reference:** Not defined in PRD — this is an unexplained UI element that shouldn't confuse users.  
**Impact:** Users expect an action; nothing happens; frustration.  
**Fix:**
- Either:
  - Wire it to a real feature (e.g., show quick action menu with dept browser, recent searches)
  - OR remove it entirely until it has a purpose
- Do NOT leave dead buttons in the UI

***

### 16.3 Medium Severity Bugs (🟡 P2 - Should Fix Before Launch)

#### Bug #7 — "School" Field Missing From Instructor Result Card
**Status:** 🟡 Medium - Incomplete data display  
**What happens:** The instructor info card displays: Name, Department, Email, Office, Office Hours — but "School" is never shown.  
**PRD reference:** Section 3.1.2 acceptance criteria explicitly requires displaying the school name.  
**Impact:** Missing information; PRD requirement not met.  
**Fix:**
- Add `School: {instructor.school}` to the result card component
- Display format: "🎓 School of Computing and Informatics" (or similar)
- Position above or below Department field

***

#### Bug #8 — Office Hours Missing AM/PM on Many Entries
**Status:** 🟡 Medium - Data quality issue  
**What happens:** Many instructors display hours like "11:30 - 1:00", "2:30 - 4:00", "4:00 - 5:00" with no AM/PM. Some entries correctly show PM (e.g., "1:00 PM – 1:30 PM") but most don't.  
**PRD reference:** Section 3.2.3 — "Format: HH:MM AM/PM – HH:MM AM/PM."  
**Impact:** Ambiguity — is 4:00 morning or afternoon? Users may miss office hours.  
**Fix:**
- Normalize ALL office_hours entries in `doctors.json` to include AM/PM
- Add a display-time parser that:
  - Detects missing AM/PM
  - Applies reasonable defaults (8-11 = AM, 12 = noon/PM, 1-7 = PM)
  - OR flags them for admin correction
- Admin form must enforce AM/PM in time inputs

***

#### Bug #9 — Invalid Time "40:00" in Real Data
**Status:** 🟡 Medium - Data validation missing  
**What happens:** Murad Yaghi's card shows "Monday: 2:30 - 40:00" — an impossible time value.  
**Impact:** Looks broken; confuses users.  
**Fix:**
- Fix the entry in `doctors.json` (likely meant 4:00 PM)
- Add data validation function on app load that:
  - Flags any time value with hours > 23 or minutes > 59
  - Logs a warning to console for admin review
  - Optionally displays "Invalid time - contact admin" instead of showing broken data

**Validation code:**
```javascript
const validateOfficeHours = (hours) => {
  const timeRegex = /(\d{1,2}):(\d{2})/g;
  const matches = hours.matchAll(timeRegex);
  for (const match of matches) {
    const [_, hour, minute] = match;
    if (parseInt(hour) > 23 || parseInt(minute) > 59) {
      console.warn(`Invalid time in office hours: ${hours}`);
      return false;
    }
  }
  return true;
};
```

***

### 16.4 Data Quality Bugs (🔵 Data Issues in doctors.json)

#### Bug #10 — Department Names Are Massively Inconsistent (Critical for Filtering)
**Status:** 🔵 Critical Data Issue - Breaks filtering  
**Problem:** The "By department" browser reveals 12 variants for what should be 3–4 departments:

**Computer Science variants:**
- "CS"
- "Computer Science"
- "Computer science"
→ All the same department

**Cyber Security variants:**
- "Cyber Security"
- "Cyber security"
- "Cybersecurity"
- "Cyber Security Department"
→ All the same department

**Data Science variants:**
- "Data Science and AI"
- "Data Science and Artificial Intelligence"
- "Data Science and Artificial Intelligent" (typo)
- "Data science and Artificial intelligence"
- "AI and Data Science"
→ All the same department

**Impact:** Filtering by department is essentially broken — each variant returns a different subset. "By department" shows 12 options instead of 3.

**Fix:**
1. Standardize to exactly 3-4 canonical values in `doctors.json`:
   - "Computer Science"
   - "Cyber Security"
   - "Data Science and Artificial Intelligence"
   - "Information Technology" (if applicable)
2. Run a find-replace pass on all entries
3. Admin form: enforce via dropdown (not free-text input)
4. Block invalid department names in admin validation

**Migration script needed:**
```javascript
const departmentMap = {
  'CS': 'Computer Science',
  'Computer science': 'Computer Science',
  'Cyber security': 'Cyber Security',
  'Cybersecurity': 'Cyber Security',
  'Cyber Security Department': 'Cyber Security',
  'Data Science and AI': 'Data Science and Artificial Intelligence',
  'AI and Data Science': 'Data Science and Artificial Intelligence',
  'Data Science and Artificial Intelligent': 'Data Science and Artificial Intelligence',
  // ... etc
};
```

***

#### Bug #11 — Malformed Entry: "Dr. Salem Alemaishat - Fall 2025 Office Hours"
**Status:** 🔵 Data bug - Ghost entry  
**What happens:** An entire heading/label was accidentally put into the name field. This ghost entry appears in name lists and department browsers.  
**Impact:** Confusing search results; looks unprofessional.  
**Fix:**
- Find and remove this entry in `doctors.json`
- Create a proper instructor object for Dr. Salem Alemaishat with:
  - Name: "Salem Alemaishat"
  - Proper department, email, office, and hours fields
- Add data validation to prevent multi-line or heading-like names

***

#### Bug #12 — Inconsistent Name Casing
**Status:** 🔵 Data quality issue  
**Examples:**
- "Orwah mohammed Aladaileh" — lowercase middle name
- Mixed capitalization appears across entries  
**Impact:** Unprofessional appearance; search may be case-sensitive.  
**Fix:**
- Run a normalization pass on all names in `doctors.json` using title case
- Function: capitalize first letter of each word, lowercase the rest
- Preserve "Al-" prefixes correctly (e.g., "Al-Omari" not "Al-omari")

**Code:**
```javascript
const titleCase = (name) => {
  return name.split(' ').map(word => {
    if (word.toLowerCase().startsWith('al-')) {
      return 'Al-' + word.slice(3).charAt(0).toUpperCase() + word.slice(4).toLowerCase();
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
};
```

***

#### Bug #13 — Inconsistent Prefix Usage
**Status:** 🔵 Data quality issue  
**What happens:** Some instructors are stored as "Dr. Huthaifa Al-Omari" while others are just "Israa Ibrahim Saadeh" — no "Dr." prefix. This is inconsistent and affects search (searching "Dr. Israa" won't match).  
**Impact:** Inconsistent presentation; search misses.  
**Fix:**
- Decide on a convention:
  - **Option A:** Never include "Dr." in the name field (store as "Huthaifa Al-Omari") — display "Dr." in UI only
  - **Option B:** Always include "Dr." for PhD holders
- Normalize all entries accordingly
- Admin form should have a separate "Title" field (Dr., Prof., etc.) instead of embedding in name

***

### 16.5 UX Improvements & Polish (💡 Nice to Have)

| # | Area | Issue | Suggested Fix |
|---|------|-------|---------------|
| 1 | **Navigation** | No way to reach Admin from the chat UI — users must manually type `/admin` | Add a small nav link in header or footer, or a hidden admin link (e.g., long-press on logo) |
| 2 | **Chat history** | Refreshing the page resets entire chat — no persistence | Save chat to sessionStorage so it survives accidental refreshes |
| 3 | **Result card** | The info card has no copy buttons | Add one-click copy icon next to email and office fields |
| 4 | **No results UX** | Error message is overly verbose with a sub-box inside the main bubble | Simplify to: "I couldn't find anyone matching 'X'. Try searching by department or check the spelling." |
| 5 | **Timestamps** | Both user and bot messages show exact same timestamp (e.g., both say 8:41 PM) making log look like single event | Bot reply timestamp should be time response was delivered, not time query was sent |
| 6 | **Autocomplete** | Ghost text autocomplete (Israa → Ibrahim Saadeh) is nice but Tab/Right-arrow to accept doesn't work — pressing Enter sends only typed text, not full suggestion | Wire Tab or ArrowRight to accept autocomplete suggestion |
| 7 | **Input placeholder** | "Type doctor name..." is grammatically off | Change to "Type a doctor's name..." |
| 8 | **Department browser** | Clicking dept tag sends it as search query bubble — looks like user typed it | Show as bot-initiated action to reduce confusion |

***

### 16.6 Bug Summary Table

| Severity | Count | Status |
|----------|-------|--------|
| 🔴 Critical | 2 | BLOCKING - Fix before any launch |
| 🟠 High | 4 | Must fix before V1 launch |
| 🟡 Medium | 3 | Should fix before V1 launch |
| 🔵 Data bugs | 4 | Requires doctors.json cleanup pass |
| 💡 UX improvements | 8 | Nice to have for V1, must have for V2 |
| **Total** | **21** | |

***

### 16.7 Critical Path to Launch

**Priority 1 (BLOCKING):**
1. Fix Bug #1 — Admin dashboard blank page
2. Fix Bug #2 — Special character sanitization
3. Fix Bug #10 — Department name standardization (data cleanup)

**Priority 2 (MUST FIX):**
4. Fix Bug #3 — Quick reply button handlers
5. Fix Bug #4 — Office hours context
6. Fix Bug #5 — Theme toggle icon
7. Fix Bug #6 — Remove or wire "+" button

**Priority 3 (SHOULD FIX):**
8. Fix Bug #7 — Add School field to cards
9. Fix Bug #8 — Normalize AM/PM in all hours
10. Fix Bug #9 — Fix invalid time + add validation
11. Fix Bugs #11-13 — Data quality cleanup

**Priority 4 (POLISH):**
12. Implement UX improvements #1-8

***

### 16.8 Testing Checklist Before Re-QA

- [ ] Admin dashboard loads and displays table
- [ ] Special chars (`!@#$`, `???`) return "invalid query" message
- [ ] Quick reply buttons trigger correct actions (not searches)
- [ ] Office hours always show with instructor name
- [ ] Theme toggle icon never disappears
- [ ] "+" button removed or functional
- [ ] School field appears on all instructor cards
- [ ] All office hours include AM/PM
- [ ] No times > 23:59 in data
- [ ] Department filter shows exactly 3-4 options (not 12)
- [ ] No malformed entries in name list
- [ ] All names properly capitalized
- [ ] "Dr." prefix consistent (all or none)

***

**Document Status:** ✅ Ready for Development  
**Next Step:** Developer review → Technical design doc → Sprint planning

**Approval:**
- [ ] Product Owner
- [ ] Department Admin/Stakeholder
- [ ] Developer (technical feasibility confirmed)

***

**End of PRD**

This document is complete and serves as the single source of truth for the HTU Computing Doctors Directory project. All feature decisions, scope, and success metrics are defined here.