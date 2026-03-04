import json
from collections import defaultdict

with open('./data/office_hours.json', encoding='utf-8') as f:
    data = json.load(f)

by_faculty = defaultdict(list)
for r in data:
    by_faculty[r['faculty']].append(r)

for name, records in sorted(by_faculty.items()):
    print(f'\n{name} ({len(records)} slots):')
    for r in records:
        print(f'  {r["day"]:12} {r["start"]:12} - {r["end"]:12} [{r["type"]}]')
