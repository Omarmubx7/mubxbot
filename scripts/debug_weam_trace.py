import importlib.util
import fitz
import re

spec = importlib.util.spec_from_file_location('parser', 'scripts/parse_office_hours.py')
parser = importlib.util.module_from_spec(spec)
spec.loader.exec_module(parser)

text = parser.extract_text('data/raw/Eng Weam.pdf')
lines = [l.strip() for l in text.split('\n')]
header_idx = parser.find_header_idx(lines)
day_order = parser.build_day_order(lines, header_idx)

print('day_order =', day_order)

records = []
i = header_idx + 1
while i < len(lines):
    line = lines[i].strip()
    if not line:
        i += 1; continue
    combined = re.match(r'[A-Z/]+\s+(\d{1,2}:\d{2})\s*[-\u2013]\s*(\d{1,2}:\d{2})', line, re.IGNORECASE)
    if combined:
        start, end = combined.group(1), combined.group(2)
        print('\nFOUND COMBINED at', i, repr(line), '->', (start,end))
        j = i + 1
        if j < len(lines) and re.match(r'[A-Z/]+\s+\d', lines[j].strip(), re.IGNORECASE):
            print(' next line looks like combined too, skipping', repr(lines[j]))
            j += 1
        cell_lines = []
        while j < len(lines) and not parser.TIME_PATTERN.match(lines[j].strip()):
            cell_lines.append(lines[j].strip())
            j += 1
        print(' collected cell_lines:', cell_lines)
        day_idx = 0
        for cell in cell_lines:
            print('  day_idx', day_idx, 'cell', repr(cell), 'AVAILABLE?', bool(parser.AVAILABLE_PATTERN.search(cell)))
            if day_idx >= len(day_order):
                break
            if cell in ('', '-'):
                day_idx += 1; continue
            if parser.AVAILABLE_PATTERN.search(cell):
                records.append(parser.make_record(
                    'faculty', 'dept', 'email', 'office', day_order[day_idx], start, end, bool(parser.ONLINE_PATTERN.search(cell))
                ))
            day_idx += 1
        i = j
        continue
    time_m = parser.TIME_PATTERN.match(line)
    if time_m:
        start, end = time_m.group(1), time_m.group(2)
        print('\nFOUND TIME at', i, repr(line), '->', (start,end))
        cell_lines = []
        j = i + 1
        while j < len(lines) and not parser.TIME_PATTERN.match(lines[j].strip()):
            cell_lines.append(lines[j].strip())
            j += 1
        print('  collected:', cell_lines)
        if any(parser.AVAILABLE_PATTERN.search(c) for c in cell_lines if c):
            day_idx = 0; k = 0
            while k < len(cell_lines) and day_idx < len(day_order):
                cell = cell_lines[k]
                print('   checking day_idx', day_idx, 'cell', repr(cell), 'AVAILABLE?', bool(parser.AVAILABLE_PATTERN.search(cell)))
                if cell in ('','-'):
                    day_idx += 1; k += 1; continue
                if parser.AVAILABLE_PATTERN.search(cell):
                    records.append(parser.make_record('faculty','dept','email','office', day_order[day_idx], start, end, bool(parser.ONLINE_PATTERN.search(cell))))
                    day_idx += 1; k += 1
                else:
                    day_idx += 1; k += 1
        i = j
        continue
    i += 1

print('\nInstrumented records:', records)
print('Count:', len(records))
