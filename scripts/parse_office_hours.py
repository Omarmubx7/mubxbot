import fitz
import json
import os
import re

RAW_FOLDER = "./data/raw"
OUTPUT_FILE = "./data/office_hours.json"

DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"]

TIME_PATTERN = re.compile(
    r'(\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm)?)\s*[-–]\s*(\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm)?)',
    re.IGNORECASE
)

AVAILABLE_PATTERN = re.compile(
    r'\bo\.?h\.?\b|office\s*hour|available|✓|☒',
    re.IGNORECASE
)

ONLINE_PATTERN = re.compile(r'online|teams', re.IGNORECASE)

BUSY_PATTERN = re.compile(
    r'\b(DSA|SDLC|CTO|Ethical|Security|FOC|Systems|Capstone|Natural|Deep|'
    r'Principles|Programming|Processing|Language|Science|Big\s*Data|'
    r'Database|DB|Website|Hacking|Design|Network)\b',
    re.IGNORECASE
)


def extract_text(pdf_path):
    doc = fitz.open(pdf_path)
    return "\n".join(page.get_text() for page in doc)


def extract_header_info(text):
    def find(pattern):
        m = re.search(pattern, text, re.IGNORECASE)
        return m.group(1).strip() if m else ""

    # Try common "Name:" layouts. Prefer the value on the same line, else
    # fall back to the next non-empty line that's not another header label.
    faculty = find(r'Name:\s*(.+?)(?:\n|$)')
    if not faculty:
        # look for Name: followed by one or more newlines then a candidate
        m = re.search(r'Name:\s*\n([\s\S]{0,200}?)\n', text, re.IGNORECASE)
        if m:
            candidate = m.group(1).strip()
            # ignore if candidate looks like another label
            if candidate and not re.match(r'(Academic School:|Department:|Email:|Office|Time/Day)', candidate, re.IGNORECASE):
                faculty = candidate

    # fallback: try to find a line that looks like a person name (starts with Dr. or Eng.)
    if not faculty:
        m = re.search(r'^(Dr\.|Eng\.|Professor|Prof\.)\s*[^\n]+', text, re.IGNORECASE | re.MULTILINE)
        if m:
            faculty = m.group(0).strip()

    faculty = re.sub(r'\s+', ' ', faculty).strip()

    department = find(r'Department:\s*(.+?)(?:\n|$)')
    email      = find(r'Email:\s*(\S+@\S+)')
    office     = find(r'(?:Office(?:\s*number|\s*location)?|Location):\s*([^\n]+)')

    # If the extracted faculty looks like a different label (e.g. 'Academic School: ...'),
    # treat it as missing so callers can fallback to filename-derived name.
    if re.match(r'Academic\s+School\s*:', faculty, re.IGNORECASE):
        faculty = ''

    return faculty or "", (department or "").strip(), (email or "").strip(), (office or "").strip()


def find_header_idx(lines):
    for i, line in enumerate(lines):
        block = " ".join(lines[i:i+10])
        if sum(1 for d in DAYS if d in block) >= 2 and any(d in line for d in DAYS):
            return i
    return None


def build_day_order(lines, header_idx):
    if sum(1 for d in DAYS if d in lines[header_idx]) >= 2:
        return [d for d in DAYS if d in lines[header_idx]]
    day_order = []
    for line in lines[header_idx:header_idx+10]:
        if line.strip() in DAYS and line.strip() not in day_order:
            day_order.append(line.strip())
    return day_order


def normalize_time(t):
    t = t.strip().replace('.', ':')
    if ':' not in t:
        t = t + ':00'
    return t


def is_busy(cell):
    return bool(BUSY_PATTERN.search(cell)) and not AVAILABLE_PATTERN.search(cell)


def make_record(faculty, department, email, office, day, start, end, online=False):
    return {
        "faculty":    faculty,
        "department": department,
        "email":      email,
        "office":     office,
        "day":        day,
        "start":      normalize_time(start),
        "end":        normalize_time(end),
        "type":       "Online (Teams)" if online else "In-Person"
    }


def deduplicate(records):
    seen = set()
    result = []
    for r in records:
        key = (r['faculty'], r['day'], r['start'], r['end'])
        if key not in seen:
            seen.add(key)
            result.append(r)
    return result


def join_split_lines(lines):
    result = []
    i = 0
    while i < len(lines):
        if lines[i].strip() == 'Office' and i+1 < len(lines) and lines[i+1].strip() == 'Hours':
            result.append('Office Hours')
            i += 2
        else:
            result.append(lines[i])
            i += 1
    return result


# ── PARSER: Dr. Salem ────────────────────────────────────────────────────────
def parse_salem(lines, header_idx, day_order, faculty, department, email, office):
    lines = join_split_lines(lines)
    records = []
    current_hour = None
    i = header_idx + 1

    while i < len(lines):
        line = lines[i].strip()

        hour_m = re.match(r'^(\d{1,2})(am|pm)$', line, re.IGNORECASE)
        if hour_m:
            current_hour = (int(hour_m.group(1)), hour_m.group(2).lower())
            i += 1
            continue

        min_m = re.match(r'^:(\d{2})$', line)
        if min_m and current_hour:
            minute = int(min_m.group(1))
            h, suffix = current_hour
            start_time = f"{h}:{minute:02d}{suffix}"
            end_m = minute + 30
            end_h = h + (1 if end_m >= 60 else 0)
            end_m = end_m % 60
            end_time = f"{end_h}:{end_m:02d}{suffix}"

            cell_lines = []
            j = i + 1
            while j < len(lines):
                nxt = lines[j].strip()
                if re.match(r'^:\d{2}$', nxt) or re.match(r'^\d{1,2}(am|pm)$', nxt, re.I):
                    break
                cell_lines.append(nxt)
                j += 1

            day_idx = 0
            for cell in cell_lines:
                if day_idx >= len(day_order):
                    break
                if cell in ("", "-", " "):
                    day_idx += 1
                    continue
                if AVAILABLE_PATTERN.search(cell):
                    records.append(make_record(
                        faculty, department, email, office,
                        day_order[day_idx], start_time, end_time
                    ))
                day_idx += 1

            i = j
            continue

        i += 1

    return records


# ── PARSER: Flat positional ──────────────────────────────────────────────────
def parse_flat_positional(lines, header_idx, day_order, faculty, department, email, office):
    records = []
    n = len(day_order)

    data_start = header_idx + 1
    for i in range(header_idx, min(header_idx + 12, len(lines))):
        if lines[i].strip() in DAYS:
            data_start = i + 1

    data_lines = [l.strip() for l in lines[data_start:]]
    while data_lines and data_lines[-1] == '':
        data_lines.pop()

    i = 0
    while i < len(data_lines):
        chunk = data_lines[i:i+n]
        if not chunk:
            break

        has_time = any(TIME_PATTERN.match(l) for l in chunk if l)

        if has_time:
            for day_idx, cell in enumerate(chunk):
                if day_idx >= n:
                    break
                if not cell or cell == '-':
                    continue
                m = TIME_PATTERN.match(cell)
                if m:
                    records.append(make_record(
                        faculty, department, email, office,
                        day_order[day_idx],
                        m.group(1), m.group(2)
                    ))
            i += n
        else:
            i += 1

    return records


# ── PARSER: Weam ─────────────────────────────────────────────────────────────
def parse_weam(lines, header_idx, day_order, faculty, department, email, office):
    records = []
    i = header_idx + 1

    while i < len(lines):
        line = lines[i].strip()
        if not line:
            i += 1
            continue

        combined = re.match(
            r'[A-Z/]+\s+(\d{1,2}:\d{2})\s*[-\u2013]\s*(\d{1,2}:\d{2})',
            line, re.IGNORECASE
        )
        if combined:
            start = combined.group(1)
            end   = combined.group(2)
            # skip the next line if it's also a combined row (M/Th variant)
            j = i + 1
            if j < len(lines) and re.match(r'[A-Z/]+\s+\d', lines[j].strip(), re.IGNORECASE):
                j += 1
            # collect Office Hour cells
            cell_lines = []
            while j < len(lines) and not TIME_PATTERN.match(lines[j].strip()):
                cell_lines.append(lines[j].strip())
                j += 1
            day_idx = 0
            for cell in cell_lines:
                if day_idx >= len(day_order):
                    break
                if cell in ('', '-'):
                    day_idx += 1
                    continue
                if AVAILABLE_PATTERN.search(cell):
                    records.append(make_record(
                        faculty, department, email, office,
                        day_order[day_idx], start, end,
                        bool(ONLINE_PATTERN.search(cell))
                    ))
                day_idx += 1
            i = j
            continue


        time_m = TIME_PATTERN.match(line)
        if time_m:
            start = time_m.group(1)
            end   = time_m.group(2)
            cell_lines = []
            j = i + 1
            while j < len(lines):
                nxt = lines[j].strip()
                if TIME_PATTERN.match(nxt) or re.match(r'[A-Z/]+\s+\d', nxt, re.IGNORECASE):
                    break
                cell_lines.append(nxt)
                j += 1
            if any(AVAILABLE_PATTERN.search(c) for c in cell_lines if c):
                day_idx = 0
                k = 0
                while k < len(cell_lines) and day_idx < len(day_order):
                    cell = cell_lines[k]
                    if cell in ('', '-'):
                        day_idx += 1; k += 1; continue
                    if AVAILABLE_PATTERN.search(cell):
                        records.append(make_record(
                            faculty, department, email, office,
                            day_order[day_idx], start, end,
                            bool(ONLINE_PATTERN.search(cell))
                        ))
                        day_idx += 1; k += 1
                    else:
                        day_idx += 1; k += 1
            i = j
            continue

        i += 1

    return records


# ── PARSER: Standard ─────────────────────────────────────────────────────────
def parse_standard(lines, header_idx, day_order, faculty, department, email, office):
    records = []
    i = header_idx + 1

    while i < len(lines):
        line = lines[i].strip()
        if not line or line in ("-", "*"):
            i += 1
            continue

        # Multiple time ranges on ONE line (Orwah style)
        all_times = TIME_PATTERN.findall(line)
        if len(all_times) >= 2:
            for idx, (start, end) in enumerate(all_times):
                if idx < len(day_order):
                    records.append(make_record(
                        faculty, department, email, office,
                        day_order[idx], start, end
                    ))
            i += 1
            continue

        # Single time range row
        time_m = TIME_PATTERN.match(line)
        if time_m:
            start = time_m.group(1)
            end   = time_m.group(2)
            cell_lines = []
            j = i + 1
            while j < len(lines) and not TIME_PATTERN.match(lines[j].strip()):
                cell_lines.append(lines[j].strip())
                j += 1

            has_available = any(AVAILABLE_PATTERN.search(c) for c in cell_lines if c)
            has_time_cell = any(TIME_PATTERN.match(c) for c in cell_lines if c)

            if has_available:
                day_idx = 0; k = 0
                while k < len(cell_lines) and day_idx < len(day_order):
                    cell = cell_lines[k]
                    if cell in ('', '-'):
                        day_idx += 1; k += 1; continue
                    if AVAILABLE_PATTERN.search(cell):
                        online = bool(ONLINE_PATTERN.search(cell))
                        if not online and k+1 < len(cell_lines):
                            if ONLINE_PATTERN.search(cell_lines[k+1]):
                                online = True; k += 1
                        records.append(make_record(
                            faculty, department, email, office,
                            day_order[day_idx], start, end, online
                        ))
                        day_idx += 1; k += 1
                    else:
                        day_idx += 1; k += 1

            elif has_time_cell:
                day_idx = 0; k = 0
                while k < len(cell_lines) and day_idx < len(day_order):
                    cell = cell_lines[k]
                    if cell in ('', '-'):
                        day_idx += 1; k += 1; continue
                    m = TIME_PATTERN.match(cell)
                    if m:
                        records.append(make_record(
                            faculty, department, email, office,
                            day_order[day_idx], m.group(1), m.group(2)
                        ))
                        day_idx += 1; k += 1
                    else:
                        day_idx += 1; k += 1

            else:
                day_idx = 0; k = 0
                while k < len(cell_lines) and day_idx < len(day_order):
                    cell = cell_lines[k]
                    if cell in ('', '-'):
                        day_idx += 1; k += 1; continue
                    if not is_busy(cell):
                        records.append(make_record(
                            faculty, department, email, office,
                            day_order[day_idx], start, end
                        ))
                    day_idx += 1; k += 1

            i = j
            continue

        # Yara style: (Office Hour) on its own line
        if re.search(r'\(office\s*hour\)', line, re.IGNORECASE):
            context = " ".join(lines[max(0, i-1):i+1])
            tm = TIME_PATTERN.search(context)
            if tm:
                count = len(re.findall(r'\(office\s*hour\)', line, re.IGNORECASE))
                for c in range(count):
                    day_idx = c
                    if day_idx < len(day_order):
                        records.append(make_record(
                            faculty, department, email, office,
                            day_order[day_idx],
                            tm.group(1), tm.group(2)
                        ))
        i += 1

    return records


# ── MAIN DISPATCHER ──────────────────────────────────────────────────────────
def parse_file(text):
    lines = [l.strip() for l in text.split("\n")]
    faculty, department, email, office = extract_header_info(text)

    header_idx = find_header_idx(lines)
    if header_idx is None:
        return []

    day_order = build_day_order(lines, header_idx)
    if not day_order:
        return []

    # Dr. Salem style: has "10am", ":00", ":30" rows
    body = "\n".join(lines[header_idx:header_idx+20])
    if re.search(r'^\d{1,2}(am|pm)$', body, re.MULTILINE | re.IGNORECASE):
        return deduplicate(
            parse_salem(lines, header_idx, day_order, faculty, department, email, office)
        )

    # Weam style: has "S/W" or "M/Th" combined rows
        # Weam style: has "S/W" or "M/Th" combined rows
    if any(re.match(r'^[A-Z]+/[A-Z]+\s+\d', l.strip()) for l in lines[header_idx:header_idx+30]):

        return deduplicate(
            parse_weam(lines, header_idx, day_order, faculty, department, email, office)
        )

    # Flat positional style: days each on their own line
    day_on_own_line = sum(
        1 for l in lines[header_idx:header_idx+10]
        if l.strip() in DAYS
    )
    if day_on_own_line >= 2:
        return deduplicate(
            parse_flat_positional(lines, header_idx, day_order, faculty, department, email, office)
        )

    # Default: standard parser
    return deduplicate(
        parse_standard(lines, header_idx, day_order, faculty, department, email, office)
    )


# ── ENTRY POINT ───────────────────────────────────────────────────────────────
def main():
    all_records = []
    files = sorted(f for f in os.listdir(RAW_FOLDER) if f.endswith(".pdf"))
    print(f"Found {len(files)} PDF files\n")

    for filename in files:
        path = os.path.join(RAW_FOLDER, filename)
        text = extract_text(path)
        records = parse_file(text)
        # If parser couldn't extract a faculty name but records exist,
        # use a cleaned filename as a fallback for faculty so output is usable.
        faculty_fallback = os.path.splitext(filename)[0]
        faculty_fallback = re.sub(r'Office\s*hours', '', faculty_fallback, flags=re.IGNORECASE)
        faculty_fallback = faculty_fallback.replace('_', ' ').replace('-', ' ').strip()
        if records:
            for r in records:
                if not r.get('faculty'):
                    r['faculty'] = faculty_fallback
        all_records.extend(records)
        status = f"→ {len(records)} slots" if records else "→ ⚠️  0 slots (needs check)"
        print(f"✓ {filename} {status}")

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(all_records, f, indent=2, ensure_ascii=False)

    print(f"\n✅ Done! {len(all_records)} total records → {OUTPUT_FILE}")
    import shutil
    shutil.copy(OUTPUT_FILE, "./public/office_hours.json")
    print("📋 Copied to public/office_hours.json")


if __name__ == "__main__":
    main()
