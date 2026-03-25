import json
import os

OUTPUT_FILE = "./data/office_hours.json"

# Load existing data
with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
    existing = json.load(f)

# Build a map of existing records by faculty, excluding those we're correcting
# so we can keep uncorrected faculty intact
CORRECTED_NAMES = {
    "Dr. Raneem Qaddoura",
    "Sami Aqeel Murshed Almashaqbeh",
    "Eng. Weaam Alrbeiqi",
    "Batool Alarmouti",
    "Aman Aloudat",
    "Ayah karajah",
    "Malak Fraihat",
    "Mohammad Yahia",
    "Orwah Mohammad Aladaileh",
    "Hana AlRasheed",
    "Malek Allouzi",
    "Israa Ibrahim Ismael Hasan",
    "Dr. Samir Tartir",
    "Dr salem.alemaishat",
    "Asma Mohammad Sabbah",
    "Yazan Al-Shannik",
    "Razan AlQuraan",
}

def r(faculty, department, email, office, day, start, end, type_="In-Person"):
    return {
        "faculty": faculty or "NULL",
        "department": department or "NULL",
        "email": email or "NULL",
        "office": office or "NULL",
        "day": day or "NULL",
        "start": start or "NULL",
        "end": end or "NULL",
        "type": type_
    }

# Keep records for faculty NOT in our correction set
kept = [rec for rec in existing if rec["faculty"] not in CORRECTED_NAMES]

# Build all corrected records
corrected = []

# Dr. Raneem Qaddoura (user: sun 13:30-14:30, wed 13:30-14:30, mon 14:30-15:30, thu 14:30-15:30)
for day in ["Sunday", "Wednesday"]:
    corrected.append(r("Dr. Raneem Qaddoura", "Data Science and Artificial Intelligence", "raneem.qaddoura@htu.edu.jo", "S-309", day, "01:30 PM", "02:30 PM"))
for day in ["Monday", "Thursday"]:
    corrected.append(r("Dr. Raneem Qaddoura", "Data Science and Artificial Intelligence", "raneem.qaddoura@htu.edu.jo", "S-309", day, "02:30 PM", "03:30 PM"))

# Sami Almashaqbeh (user: sun 11:30-1, mon 10-11:30, wed 11:30-1, thu 10-11:30)
for day in ["Sunday", "Wednesday"]:
    corrected.append(r("Sami Aqeel Murshed Almashaqbeh", "Cyber Security", "sami.al-mashaqbeh@htu.edu.jo", "S-310", day, "11:30 AM", "01:00 PM"))
for day in ["Monday", "Thursday"]:
    corrected.append(r("Sami Aqeel Murshed Almashaqbeh", "Cyber Security", "sami.al-mashaqbeh@htu.edu.jo", "S-310", day, "10:00 AM", "11:30 AM"))

# Weaam Alrbeiqi (user: mon 11:30-1, thu 11:30-1, sun 10-11:30)
corrected.append(r("Eng. Weaam Alrbeiqi", "Cyber Security", "Weaam.Alrbeiqi@htu.edu.jo", "s-320", "Sunday", "10:00 AM", "11:30 AM"))
for day in ["Monday", "Thursday"]:
    corrected.append(r("Eng. Weaam Alrbeiqi", "Cyber Security", "Weaam.Alrbeiqi@htu.edu.jo", "s-320", day, "11:30 AM", "01:00 PM"))

# Batool Alarmouti (user: sat 10:30-11:30, mon 1-2, tue 1-2, thu 9-10)
corrected.append(r("Batool Alarmouti", "Data Science and Artificial Intelligence", "batool.alarmouti@htu.edu.jo", "S-320", "Saturday", "10:30 AM", "11:30 AM"))
corrected.append(r("Batool Alarmouti", "Data Science and Artificial Intelligence", "batool.alarmouti@htu.edu.jo", "S-320", "Monday", "01:00 PM", "02:00 PM"))
corrected.append(r("Batool Alarmouti", "Data Science and Artificial Intelligence", "batool.alarmouti@htu.edu.jo", "S-320", "Tuesday", "01:00 PM", "02:00 PM"))
corrected.append(r("Batool Alarmouti", "Data Science and Artificial Intelligence", "batool.alarmouti@htu.edu.jo", "S-320", "Thursday", "09:00 AM", "10:00 AM"))

# Aman Aloudat (user: sun 10-11, mon 10-11, wed 10-11, thu 10-11)
for day in ["Sunday", "Monday", "Wednesday", "Thursday"]:
    corrected.append(r("Aman Aloudat", "Cybersecurity", "aman.aloudat@htu.edu.jo", "S-321", day, "10:00 AM", "11:00 AM"))

# Ayah karajah (user: sat 10-11:30, sun 1-1:30, tue 10-11:30, wed 1-1:30)
corrected.append(r("Ayah karajah", "Data science and Artificial intelligence", "Ayah.karajeh@htu.edu.jo", "S312", "Saturday", "10:00 AM", "11:30 AM"))
corrected.append(r("Ayah karajah", "Data science and Artificial intelligence", "Ayah.karajeh@htu.edu.jo", "S312", "Sunday", "01:00 PM", "01:30 PM"))
corrected.append(r("Ayah karajah", "Data science and Artificial intelligence", "Ayah.karajeh@htu.edu.jo", "S312", "Tuesday", "10:00 AM", "11:30 AM"))
corrected.append(r("Ayah karajah", "Data science and Artificial intelligence", "Ayah.karajeh@htu.edu.jo", "S312", "Wednesday", "01:00 PM", "01:30 PM"))

# Malak Fraihat (user: sat, sun, tue, wed 11:30-12:30)
for day in ["Saturday", "Sunday", "Tuesday", "Wednesday"]:
    corrected.append(r("Malak Fraihat", "Artificial intelligence and Data Science", "Malak.fraihat@htu.edu.jo", "NULL", day, "11:30 AM", "12:30 PM"))

# Mohammad Yahia (user: sat, sun, mon, tue 11:30-12:30)
for day in ["Saturday", "Sunday", "Monday", "Tuesday"]:
    corrected.append(r("Mohammad Yahia", "Computer Science", "mohammad.yahia@htu.edu.jo", "S-318", day, "11:30 AM", "12:30 PM"))

# Orwah Mohammad Aladaileh (user: sun 1-2, mon 11:30-2, wed 1-2)
corrected.append(r("Orwah Mohammad Aladaileh", "Computer Science", "orwa.aladaileh@htu.edu.jo", "NULL", "Sunday", "01:00 PM", "02:00 PM"))
corrected.append(r("Orwah Mohammad Aladaileh", "Computer Science", "orwa.aladaileh@htu.edu.jo", "NULL", "Monday", "11:30 AM", "02:00 PM"))
corrected.append(r("Orwah Mohammad Aladaileh", "Computer Science", "orwa.aladaileh@htu.edu.jo", "NULL", "Wednesday", "01:00 PM", "02:00 PM"))

# Hana AlRasheed (user: sun 10-11, mon 11-12, wed 10-11, thu 11-12)
corrected.append(r("Hana AlRasheed", "Computer Science", "hana.alrasheed@htu.edu.jo", "S312", "Sunday", "10:00 AM", "11:00 AM"))
corrected.append(r("Hana AlRasheed", "Computer Science", "hana.alrasheed@htu.edu.jo", "S312", "Monday", "11:00 AM", "12:00 PM"))
corrected.append(r("Hana AlRasheed", "Computer Science", "hana.alrasheed@htu.edu.jo", "S312", "Wednesday", "10:00 AM", "11:00 AM"))
corrected.append(r("Hana AlRasheed", "Computer Science", "hana.alrasheed@htu.edu.jo", "S312", "Thursday", "11:00 AM", "12:00 PM"))

# Malek Allouzi (user: sun 10-11:30, mon 10-11:30 + 1-1:30, wed 10-11:30, thu 10-11:30 + 1-1:30)
for day in ["Sunday", "Monday", "Wednesday", "Thursday"]:
    corrected.append(r("Malek Allouzi", "Computer Science", "Malik.Louzi@htu.edu.jo", "S-310", day, "10:00 AM", "11:30 AM"))
for day in ["Monday", "Thursday"]:
    corrected.append(r("Malek Allouzi", "Computer Science", "Malik.Louzi@htu.edu.jo", "S-310", day, "01:00 PM", "01:30 PM"))

# Israa Ibrahim Ismael Hasan (user: sat, sun, tue, wed 10:30-11:30)
for day in ["Saturday", "Sunday", "Tuesday", "Wednesday"]:
    corrected.append(r("Israa Ibrahim Ismael Hasan", "Cyber security", "Israa.hasan@htu.edu.jo", "321", day, "10:30 AM", "11:30 AM"))

# Dr. Samir Tartir (user: sat, sun, tue, wed 11:30-12:30)
for day in ["Saturday", "Sunday", "Tuesday", "Wednesday"]:
    corrected.append(r("Dr. Samir Tartir", "Computer Science", "samir.tartir@gmail.com", "S-324", day, "11:30 AM", "12:30 PM"))

# Dr. Salem Alemaishat (user: sun 1-2:30, wed 1-2:30, thu 2:30-3)
corrected.append(r("Dr. Salem Alemaishat", "Computer Science", "salem.alemaishat@htu.edu.jo", "S-323", "Sunday", "01:00 PM", "02:30 PM"))
corrected.append(r("Dr. Salem Alemaishat", "Computer Science", "salem.alemaishat@htu.edu.jo", "S-323", "Wednesday", "01:00 PM", "02:30 PM"))
corrected.append(r("Dr. Salem Alemaishat", "Computer Science", "salem.alemaishat@htu.edu.jo", "S-323", "Thursday", "02:30 PM", "03:00 PM"))

# Asma Sabbah (user: mon 11:30-1, tue 2:30-4, wed 1-2:30, thu 2:30-4)
corrected.append(r("Asma Mohammad Sabbah", "Computer Science", "asma.sabbah@htu.edu.jo", "S-311", "Monday", "11:30 AM", "01:00 PM"))
corrected.append(r("Asma Mohammad Sabbah", "Computer Science", "asma.sabbah@htu.edu.jo", "S-311", "Tuesday", "02:30 PM", "04:00 PM"))
corrected.append(r("Asma Mohammad Sabbah", "Computer Science", "asma.sabbah@htu.edu.jo", "S-311", "Wednesday", "01:00 PM", "02:30 PM"))
corrected.append(r("Asma Mohammad Sabbah", "Computer Science", "asma.sabbah@htu.edu.jo", "S-311", "Thursday", "02:30 PM", "04:00 PM"))

# Yazan Al-Shannik (user: sun 9-10, mon 1:30-2:30, wed 9-10, thu 1:30-2:30)
for day in ["Sunday", "Wednesday"]:
    corrected.append(r("Yazan Al-Shannik", "Cyber Security", "Yazan.alshannik@htu.edu.jo", "W-B05", day, "09:00 AM", "10:00 AM"))
for day in ["Monday", "Thursday"]:
    corrected.append(r("Yazan Al-Shannik", "Cyber Security", "Yazan.alshannik@htu.edu.jo", "W-B05", day, "01:30 PM", "02:30 PM"))

# Razan AlQuraan (user: sun 4-5, mon 4-5, wed 12-1, thu 12-1)
for day in ["Sunday", "Monday"]:
    corrected.append(r("Razan AlQuraan", "Computer Science", "razan.alquran@htu.edu.jo", "S-313", day, "04:00 PM", "05:00 PM"))
for day in ["Wednesday", "Thursday"]:
    corrected.append(r("Razan AlQuraan", "Computer Science", "razan.alquran@htu.edu.jo", "S-313", day, "12:00 PM", "01:00 PM"))

# Merge and save
all_records = kept + corrected

with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
    json.dump(all_records, f, indent=2, ensure_ascii=False)

print(f"Done! Saved {len(all_records)} total records ({len(kept)} kept + {len(corrected)} corrected)")

# Print summary of corrected names
from collections import Counter
counts = Counter(r["faculty"] for r in corrected)
for name, cnt in sorted(counts.items()):
    print(f"  {name}: {cnt} slots")
