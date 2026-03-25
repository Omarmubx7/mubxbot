import fitz
import os
import sys
sys.stdout.reconfigure(encoding='utf-8')

RAW_FOLDER = "./data/raw"

files = sorted(f for f in os.listdir(RAW_FOLDER) if f.endswith(".pdf"))
print(f"Scanning {len(files)} PDFs...\n")

for filename in files:
    path = os.path.join(RAW_FOLDER, filename)
    doc = fitz.open(path)
    text = "\n".join(page.get_text() for page in doc)
    print(f"\n{'='*60}")
    print(f"FILE: {filename}")
    print(f"{'='*60}")
    # Clean up and print only the schedule portion (skip header)
    lines = [l.strip() for l in text.split('\n')]
    # Find Time/Day line and print from there
    start = 0
    for i, l in enumerate(lines):
        if 'time/day' in l.lower() or 'time\u202f/\u202fday' in l.lower():
            start = i
            break
    print('\n'.join(lines[max(0, start-2):start+80]))
