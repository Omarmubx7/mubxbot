import os
import json
import importlib.util

spec = importlib.util.spec_from_file_location('parser', 'scripts/parse_office_hours.py')
parser = importlib.util.module_from_spec(spec)
spec.loader.exec_module(parser)

RAW = 'data/raw'
REPORT = 'scripts/verify_report.json'

files = sorted(f for f in os.listdir(RAW) if f.endswith('.pdf'))
report = []
all_ok = True

for fn in files:
    path = os.path.join(RAW, fn)
    text = parser.extract_text(path)
    recs = parser.parse_file(text)
    faculty, department, email, office = parser.extract_header_info(text)
    lines = [l.strip() for l in text.split('\n')]
    header_idx = parser.find_header_idx(lines)
    day_order = parser.build_day_order(lines, header_idx) if header_idx is not None else []
    time_matches = [l for l in lines if parser.TIME_PATTERN.search(l)]
    avail_matches = [l for l in lines if parser.AVAILABLE_PATTERN.search(l)]
    rec_count = len(recs)
    ok = rec_count > 0 and faculty and email and day_order
    if not ok:
        all_ok = False
    report.append({
        'file': fn,
        'slots': rec_count,
        'faculty': faculty,
        'email': email,
        'office': office,
        'day_order': day_order,
        'time_matches_sample': time_matches[:5],
        'available_sample': avail_matches[:5],
        'header_idx': header_idx,
        'ok': ok
    })

with open(REPORT, 'w', encoding='utf-8') as f:
    json.dump({'all_ok': all_ok, 'files': report}, f, indent=2, ensure_ascii=False)

print('Wrote', REPORT)
print('all_ok =', all_ok)
for r in report:
    if not r['ok']:
        print(r)
