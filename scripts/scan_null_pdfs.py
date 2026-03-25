import fitz
import os
import re

RAW_FOLDER = "./data/raw"

NULL_FACULTY = [
    "Aman Aloudat",
    "Ayah karajah", 
    "Dr salem.alemaishat",
    "Dr. Rami Al-Ouran",
    "Dr. Samir Tartir",
    "Hana AlRasheed",
    "Israa Ibrahim Ismael Hasan",
    "Malak Fraihat",
    "Malek Allouzi",
    "Mohammad Yahia",
    "Orwah Mohammad Aladaileh",
    "Yazan Al-Shannik",
]

files = sorted(f for f in os.listdir(RAW_FOLDER) if f.endswith(".pdf"))

for filename in files:
    path = os.path.join(RAW_FOLDER, filename)
    doc = fitz.open(path)
    text = "\n".join(page.get_text() for page in doc)
    
    # Check if this might be one of our null faculty
    # Look for any matching name in the text
    is_null = any(
        re.search(re.escape(name.split()[-1]), text, re.IGNORECASE)
        for name in NULL_FACULTY
    )
    
    if is_null:
        print(f"\n{'='*60}")
        print(f"FILE: {filename}")
        print(f"{'='*60}")
        print(text[:2000])  # First 2000 chars is enough to see the structure
        print()
