import fitz

files = ['data/raw/Dr-Salem.pdf','data/raw/Eng Shatha_Hawawsheh_Office hours.pdf']

for fn in files:
    print('\n===', fn, '===\n')
    doc = fitz.open(fn)
    text = '\n'.join(p.get_text() for p in doc)
    lines = text.split('\n')
    for i, l in enumerate(lines[:120]):
        print(f'{i:03d}: {l}')
