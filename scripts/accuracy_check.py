import os, json, re, importlib.util
from collections import defaultdict

spec = importlib.util.spec_from_file_location('parser', 'scripts/parse_office_hours.py')
parser = importlib.util.module_from_spec(spec)
spec.loader.exec_module(parser)

RAW = 'data/raw'
JSON = 'data/office_hours.json'
REPORT = 'scripts/accuracy_report.json'

with open(JSON, encoding='utf-8') as f:
    all_records = json.load(f)

# index json records by email and by faculty
by_email = defaultdict(list)
by_faculty = defaultdict(list)
for r in all_records:
    by_email[r.get('email','').lower()].append(r)
    by_faculty[r.get('faculty','').lower()].append(r)

TIME_RE = re.compile(r'^(\d{1,2}):(\d{2})\s*(am|pm)?$', re.IGNORECASE)
EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')

files = sorted(f for f in os.listdir(RAW) if f.endswith('.pdf'))
report = []

for fn in files:
    path = os.path.join(RAW, fn)
    text = parser.extract_text(path)
    header_faculty, header_dept, header_email, header_office = parser.extract_header_info(text)
    parsed = parser.parse_file(text)
    issues = []

    # parity checks: counts
    slots_from_parser = len(parsed)
    # try to match json records by email or header faculty or filename fallback
    matched_json = []
    key_email = header_email.lower() if header_email else ''
    if key_email and key_email in by_email:
        matched_json = by_email[key_email]
    else:
        # by faculty match
        if header_faculty:
            matched_json = by_faculty.get(header_faculty.lower(), [])
        else:
            # fallback to filename-derived faculty
            fallback = os.path.splitext(fn)[0]
            fallback = re.sub(r'Office\s*hours','',fallback,flags=re.IGNORECASE).replace('_',' ').replace('-',' ').strip().lower()
            matched_json = by_faculty.get(fallback, [])

    slots_in_json = len(matched_json)
    if slots_from_parser != slots_in_json:
        issues.append(f'slots_mismatch: parser={slots_from_parser} json_matched={slots_in_json}')

    # validate header fields
    if header_faculty and header_faculty.strip().lower().startswith('academic school'):
        issues.append('header_faculty_looks_like_academic_school')
    if header_email and not EMAIL_RE.match(header_email):
        issues.append('header_email_invalid')

    # validate each record from parser run
    for idx, r in enumerate(parsed):
        rec_issues = []
        s = r.get('start','').strip()
        e = r.get('end','').strip()
        ms = TIME_RE.match(s)
        me = TIME_RE.match(e)
        if not ms:
            rec_issues.append(f'start_unparseable:{s}')
        if not me:
            rec_issues.append(f'end_unparseable:{e}')
        else:
            # check end > start where possible. If no am/pm suffixes present and
            # end <= start, assume end is PM (add 12 hours) which fixes many cases.
            if ms and me:
                def to_minutes(m):
                    hh = int(m.group(1)); mm = int(m.group(2)); suffix = (m.group(3) or '').lower()
                    if suffix:
                        if suffix == 'pm' and hh != 12:
                            hh += 12
                        if suffix == 'am' and hh == 12:
                            hh = 0
                    return hh*60 + mm, bool(suffix)
                try:
                    start_min, start_has_suffix = to_minutes(ms)
                    end_min, end_has_suffix = to_minutes(me)
                    if end_min <= start_min:
                        # if neither has suffix, assume end is PM (add 12h)
                        if not start_has_suffix and not end_has_suffix:
                            end_min += 12*60
                        else:
                            rec_issues.append(f'end_not_after_start:{s}-{e}')
                    # still a problem after adjustment
                    if end_min <= start_min:
                        rec_issues.append(f'end_not_after_start:{s}-{e}')
                except Exception:
                    rec_issues.append('time_compare_error')
        if not r.get('faculty'):
            rec_issues.append('missing_faculty')
        if not r.get('email'):
            rec_issues.append('missing_email')
        if not r.get('office'):
            rec_issues.append('missing_office')
        if rec_issues:
            issues.append({'record_index': idx, 'issues': rec_issues, 'record': r})

    report.append({
        'file': fn,
        'header_faculty': header_faculty,
        'header_email': header_email,
        'slots_parser': slots_from_parser,
        'slots_json_matched': slots_in_json,
        'issues': issues
    })

with open(REPORT, 'w', encoding='utf-8') as f:
    json.dump(report, f, indent=2, ensure_ascii=False)

# print concise summary
bad = [r for r in report if r['issues']]
print(f'Checked {len(files)} files — {len(bad)} files have issues. Report: {REPORT}')
for r in bad:
    print(r['file'], 'issues:', r['issues'][:3])

print('\nIf you want, I can open the detailed report or iterate fixes for flagged files.')
