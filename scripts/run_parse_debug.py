import importlib.util
import fitz
import json
from pprint import pprint

spec = importlib.util.spec_from_file_location('parser', 'scripts/parse_office_hours.py')
parser = importlib.util.module_from_spec(spec)
spec.loader.exec_module(parser)

path = 'data/raw/Eng Weam.pdf'
text = parser.extract_text(path)

print('Calling parse_file...')
records = parser.parse_file(text)
print('Returned records count:', len(records))
if records:
    pprint(records)
else:
    print('No records. Showing nearby lines and pattern matches:')
    lines = [l.strip() for l in text.split('\n')]
    header_idx = parser.find_header_idx(lines)
    print('header_idx =', header_idx)
    day_order = parser.build_day_order(lines, header_idx) if header_idx is not None else []
    print('day_order =', day_order)
    for i in range(header_idx, min(header_idx+60, len(lines))):
        l = lines[i]
        print(i, repr(l), 'TIME_MATCH' if parser.TIME_PATTERN.match(l) else '')

    # show which lines match AVAILABLE_PATTERN
    print('\nLines matching AVAILABLE_PATTERN:')
    for i,l in enumerate(lines):
        if parser.AVAILABLE_PATTERN.search(l):
            print(i, repr(l))

    print('\nLines matching combined regex:')
    for i,l in enumerate(lines[header_idx:header_idx+60], start=header_idx):
        if re_match := parser.re.match(r'[A-Z/]+\s+(\d{1,2}:\d{2})\s*[-\u2013]\s*(\d{1,2}:\d{2})', l, re.IGNORECASE):
            print(i, repr(l), '->', re_match.groups())

    print('\nDump records from parse_weam internal call:')
    # call parse_weam directly
    recs = parser.parse_weam(lines, header_idx, day_order, *parser.extract_header_info(text))
    print('parse_weam returned', len(recs))
    pprint(recs)

# write extracted text to a temp file for inspection
with open('scripts/eng_weam_text.txt','w',encoding='utf-8') as f:
    f.write(text)
print('Wrote scripts/eng_weam_text.txt')
