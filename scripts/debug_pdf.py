import fitz
import sys

path = "./data/raw/Eng Rahma.pdf"  # the one that got 1 slot
doc = fitz.open(path)
for page in doc:
    print(page.get_text())
