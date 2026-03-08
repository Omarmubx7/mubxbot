# MUBXBot Bug Report - March 8, 2026

## Summary
Comprehensive bug scan completed on the MUBXBot application. Most features working correctly. Found 1-2 minor issues to address.

---

## Bugs Found

### BUG #1: Office Number Search Returns Fuzzy Matches Instead of Exact Office Matches
**Severity:** MEDIUM  
**Status:** NEEDS FIXING  

**Description:**
When searching for an office number (e.g., "S321" → formatted to "S-321"), the search performs a fuzzy match on faculty names instead of filtering by office location.

**Steps to Reproduce:**
1. Type "S321" in the search box
2. Observe results

**Expected Behavior:**
Should return only faculty members with office "S-321"

**Actual Behavior:**
Returns faculty members whose names contain "S" with fuzzy matching algorithm

**Root Cause:**
The `formatOffice()` function converts "S321" to "S-321", but the search queries against the `doctors.json` data which contains fuzzy search on name/department/office. The office field is being searched but fuzzy matching is too lenient.

**Recommended Fix:**
Implement a strict office number filter in `handleBotResponse()`:
```javascript
if (query.match(/^[A-Z]-\d{3}$/)) {
  // Filter doctors by exact office match
  const officeMatches = instructors.filter(i => i.office === query);
  // Display results for these doctors
}
```

---

### BUG #2: Inconsistent Quick Reply Display in Multiple Results View (MINOR)
**Severity:** LOW  
**Status:** AMBIGUOUS  

**Description:**
When searching returns multiple faculty members (5+ results), quick reply buttons may not appear consistently. When viewing a single faculty member result, quick replies display correctly below the office hours card.

**Steps to Reproduce:**
1. Search for a partial name that returns 5+ results (e.g., "Cyber Security" → 5 people)
2. Click on one result
3. Observe quick reply buttons

**Expected Behavior:**
Quick reply buttons ("Search another", "By department") should always appear after office hours display

**Actual Behavior:**
Buttons appear for single searches but may be below viewport in multiple results view - not a bug, just UX issue

**Recommendation:**
Ensure UI automatically scrolls to quick replies when they appear, or add a subtle indicator that more buttons exist below.

---

## Features Tested ✅

### ✅ Working Correctly

1. **Search by Faculty Name**
   - Single name search works perfectly
   - Partial name matching works
   - Non-existent searches show "not found" message with suggestions

2. **Search by Department**
   - "Computer Science" search returns results ✓
   - "Cyber Security" search returns results ✓
   - "Data Science and Artificial Intelligence" search returns results ✓
   - Department alias shortcuts work ("ai", "cs", "cyber") ✓

3. **Office Hours Display**
   - Faculty office hours display correctly
   - Multiple days per faculty shown properly
   - Office location, times, and type all display correctly

4. **Teams Button Integration**
   - Button appears in office hours card ✓
   - Button is clickable ✓
   - Opens Teams with faculty email search ✓
   - Works with dark/light theme ✓

5. **Theme Toggle**
   - Dark mode toggle works perfectly ✓
   - Theme persists in localStorage ✓
   - All text readable in both themes ✓

6. **Quick Reply Buttons**
   - Show after single faculty search ✓
   - "Search another" button functional ✓
   - "By department" button functional ✓
   - "Office hours" button functional ✓

7. **Input & Validation**
   - Input field accepts text ✓
   - Send button disabled when empty ✓
   - Send button enabled with text ✓
   - Suggestions overlay displays during typing ✓

8. **Message Display**
   - User messages show on right with red background ✓
   - Bot messages show on left with gray background ✓
   - Timestamps display correctly ✓
   - Doctor cards render properly ✓

9. **Data Loading**
   - Both doctors.json and office_hours.json load correctly ✓
   - No console errors ✓
   - No network failures ✓

---

## Performance Notes
- App loads quickly (< 1 second)
- No lag on search/filter operations
- Dark mode toggle is instant
- Message display is smooth and responsive

---

## Recommendations

### High Priority
1. Fix office number search to use exact matching instead of fuzzy matching on office field

### Medium Priority
1. Add better UX for quick replies when they're below the fold
2. Consider adding keyboard shortcuts (e.g., "Enter" to send)

### Low Priority
1. Add copy-to-clipboard button for email addresses
2. Add favorites/bookmark for frequently searched faculty

---

## Testing Environment
- **Browser:** Chrome-like (Playwright)
- **Date:** March 8, 2026
- **Time:** 8:48 PM
- **Server:** http://localhost:5174
- **Status:** All tests passed except noted bugs

---

## Next Steps
1. Prioritize fixing Bug #1 (office search)
2. Improve UX for quick replies
3. Deploy to production
