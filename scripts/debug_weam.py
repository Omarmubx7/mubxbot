import fitz
import re

DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"]

def extract_text(pdf_path):
    doc = fitz.open(pdf_path)
    return "\n".join(page.get_text() for page in doc)

TIME_PATTERN = re.compile(
    r'(\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm)?)\s*[-–]\s*(\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm)?)',
    re.IGNORECASE
)

path = 'data/raw/Eng Weam.pdf'
text = extract_text(path)
lines = [l.strip() for l in text.split('\n')]

# find header idx
header_idx = None
for i, line in enumerate(lines):
    block = " ".join(lines[i:i+10])
    if sum(1 for d in DAYS if d in block) >= 2 and any(d in line for d in DAYS):
        header_idx = i
        break

print('header_idx=', header_idx)
if header_idx is not None:
    print('\nHeader lines (next 12 lines):')
    for j in range(header_idx, min(header_idx+12, len(lines))):
        print(j, repr(lines[j]))

# build day order
if header_idx is not None:
    day_order = []
    if sum(1 for d in DAYS if d in lines[header_idx]) >= 2:
        day_order = [d for d in DAYS if d in lines[header_idx]]
    else:
        for line in lines[header_idx:header_idx+10]:
            if line.strip() in DAYS and line.strip() not in day_order:
                day_order.append(line.strip())
    print('\nDay order:', day_order)

# print a slice of lines after header
start = header_idx if header_idx is not None else 0
print('\nLines 0..60:')
for i in range(0, min(60, len(lines))):
    print(i, repr(lines[i]))

# show all lines for inspection
print('\n--- FULL EXTRACTED TEXT ---\n')
print(text)
