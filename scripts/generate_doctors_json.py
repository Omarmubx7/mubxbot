import json
from collections import defaultdict

INPUT  = "./data/office_hours.json"
OUTPUT = "./public/doctors.json"

with open(INPUT, encoding="utf-8") as f:
    slots = json.load(f)

# Group slots by faculty
by_faculty = defaultdict(list)
for slot in slots:
    by_faculty[slot["faculty"]].append(slot)

doctors = []
for faculty, records in by_faculty.items():
    if not faculty or faculty == "Unknown":
        continue

    # Build office_hours dict: { "Sunday": "10:00 – 11:30", ... }
    # If multiple slots on same day, join them with ", "
    day_slots = defaultdict(list)
    for r in records:
        time_str = f"{r['start']} – {r['end']}"
        if r["type"] == "Online (Teams)":
            time_str += " (Online)"
        day_slots[r["day"]].append(time_str)

    office_hours = {
        day: ", ".join(times)
        for day, times in day_slots.items()
    }

    # Day order
    day_order = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"]
    office_hours_ordered = {
        day: office_hours[day]
        for day in day_order
        if day in office_hours
    }

    doctors.append({
        "name":         records[0]["faculty"],
        "school":       "School of Computing and Informatics",
        "department":   records[0]["department"],
        "email":        records[0]["email"],
        "office":       records[0]["office"],
        "office_hours": office_hours_ordered
    })

# Sort by name
doctors.sort(key=lambda x: x["name"])

with open(OUTPUT, "w", encoding="utf-8") as f:
    json.dump(doctors, f, indent=2, ensure_ascii=False)

print(f"✅ Generated {len(doctors)} doctors → {OUTPUT}")
