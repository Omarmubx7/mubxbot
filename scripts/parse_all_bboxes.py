import fitz
import json
import re
import os

RAW_FOLDER = "./data/raw"
OUTPUT_FILE = "./data/office_hours.json"
DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"]

def format_time_ampm(t_str):
    parts = t_str.split(':')
    if len(parts) != 2: return t_str
    try:
        h = int(parts[0])
        m = parts[1]
        
        if 1 <= h <= 7:
            return f"{h:02d}:{m:02s} PM"
        elif 8 <= h <= 11:
            return f"{h:02d}:{m:02s} AM"
        elif h == 12:
            return f"{h:02d}:{m:02s} PM"
    except:
        pass
    return t_str

def parse_with_bboxes(pdf_path, filename):
    doc = fitz.open(pdf_path)
    page = doc[0]
    words = page.get_text("words")
    text = page.get_text("text")

    def find(pattern):
        m = re.search(pattern, text, re.IGNORECASE)
        val = m.group(1).strip() if m else ""
        return val if val else "NULL"
        
    faculty = find(r'Name:\s*(.+?)(?:\n|$)')
    department = find(r'Department:\s*(.+?)(?:\n|$)')
    email = find(r'Email:\s*(\S+@\S+)')
    office = find(r'(?:Office(?:\s*number|\s*location)?|Location):\s*([^\n]+)')
    
    if faculty == "NULL" or re.match(r'^Academic\s+School', faculty, re.IGNORECASE):
        faculty_fallback = os.path.splitext(filename)[0]
        faculty_fallback = re.sub(r'Office\s*hours', '', faculty_fallback, flags=re.IGNORECASE)
        faculty_fallback = faculty_fallback.replace('_', ' ').replace('-', ' ').strip()
        faculty = faculty_fallback or "NULL"
        
    # Group words into physical lines by vertical proximity
    lines = []
    sorted_words = sorted(words, key=lambda w: (w[1], w[0]))
    current_line = []
    current_top = None
    
    for w in sorted_words:
        top = w[1]
        if current_top is None:
            current_top = top
            current_line.append(w)
        else:
            if abs(top - current_top) < 5:  # Same line tolerance
                current_line.append(w)
            else:
                lines.append(current_line)
                current_line = [w]
                current_top = top
    if current_line:
        lines.append(current_line)
        
    cols = {}
    for line in lines:
        for w in line:
            text_word = w[4].strip()
            for d in DAYS:
                if text_word.lower() == d.lower() or text_word.lower().startswith(d.lower()):
                    if d not in cols:
                        cols[d] = {"x0": w[0], "x1": w[2], "center": (w[0] + w[2])/2}

    sorted_cols = sorted(cols.items(), key=lambda item: item[1]["center"])
    
    # Identify time rows by looking at whole lines
    rows = []
    for line in lines:
        line_text = " ".join([w[4] for w in sorted(line, key=lambda w: w[0])])
        t_match = re.search(r'(\d{1,2}(?:[:.]\d{2})?)\s*(?:am|pm)?\s*[-–]\s*(\d{1,2}(?:[:.]\d{2})?)\s*(?:am|pm)?', line_text, re.IGNORECASE)
        if t_match:
            # We found a time row
            y0 = min([w[1] for w in line])
            y1 = max([w[3] for w in line])
            
            # Normalize start and end
            start_raw = t_match.group(1).replace('.', ':')
            end_raw = t_match.group(2).replace('.', ':')
            if ':' not in start_raw: start_raw += ':00'
            if ':' not in end_raw: end_raw += ':00'
            
            time_str = f"{start_raw}-{end_raw}"
            rows.append({"text": time_str, "y0": y0, "y1": y1, "center": (y0 + y1)/2, "start_raw": start_raw, "end_raw": end_raw})

    rows = sorted(rows, key=lambda r: r["center"])
    
    records = []
    for i, row in enumerate(rows):
        top_y = row["y0"] - 5
        bottom_y = rows[i+1]["y0"] - 5 if i + 1 < len(rows) else page.rect.height
        
        row_words = [w for w in words if w[1] >= top_y and w[3] <= bottom_y]
        
        for day, col_info in sorted_cols:
            cell_words = []
            for w in row_words:
                wx = (w[0] + w[2])/2
                if not sorted_cols: continue
                closest_col = min(sorted_cols, key=lambda c: abs(c[1]["center"] - wx))
                if closest_col[0] == day:
                    cell_words.append(w)
                    
            content = " ".join([w[4] for w in sorted(cell_words, key=lambda w: (w[1], w[0]))])
            
            # Skip if it is purely the time string text
            raw_content_no_space = content.replace(' ', '')
            if re.search(r'\d{1,2}[:.]\d{2}', raw_content_no_space) and '-' in raw_content_no_space and len(raw_content_no_space) < 15:
                continue
                
            is_oh = re.search(r'\bo\.?h\.?\b|office\s*hour|available|✓|☒', content, re.IGNORECASE)
            is_busy = re.search(r'\b(DSA|SDLC|CTO|Ethical|Security|FOC|Systems|Capstone|Natural|Deep|Principles|Programming|Processing|Language|Science|Data|Database|DB|Website|Hacking|Design|Network|Fundamentals|AI)\b', content, re.IGNORECASE)
            
            # If explicit office hour OR (non-empty, not busy, and not just another time string)
            if is_oh or (content.strip() and not is_busy and not re.search(r'\d{1,2}[:.]\d{2}', content)):
                start_time = format_time_ampm(row["start_raw"])
                end_time = format_time_ampm(row["end_raw"])
                is_online = bool(re.search(r'online|teams', content, re.IGNORECASE))
                
                records.append({
                    "faculty": faculty if faculty.strip() else "NULL",
                    "department": department if department.strip() else "NULL",
                    "email": email if email.strip() else "NULL",
                    "office": office if office.strip() else "NULL",
                    "day": day if day.strip() else "NULL",
                    "start": start_time if start_time.strip() else "NULL",
                    "end": end_time if end_time.strip() else "NULL",
                    "type": "Online (Teams)" if is_online else "In-Person",
                    "_raw": content
                })

    if not records:
        records.append({
            "faculty": faculty if faculty.strip() else "NULL",
            "department": department if department.strip() else "NULL",
            "email": email if email.strip() else "NULL",
            "office": office if office.strip() else "NULL",
            "day": "NULL",
            "start": "NULL",
            "end": "NULL",
            "type": "In-Person"
        })

    # Optional deduplication
    unique_records = []
    seen = set()
    for r in records:
        key = (r["faculty"], r["day"], r["start"], r["end"])
        if key not in seen:
            seen.add(key)
            unique_records.append(r)

    return unique_records

def main():
    all_records = []
    files = sorted(f for f in os.listdir(RAW_FOLDER) if f.endswith(".pdf"))
    print(f"Found {len(files)} PDF files")
    
    for filename in files:
        path = os.path.join(RAW_FOLDER, filename)
        try:
            records = parse_with_bboxes(path, filename)
            all_records.extend(records)
            print(f"✓ {filename} -> {len(records)} slots")
        except Exception as e:
            print(f"X {filename} -> ERROR {e}")
            
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(all_records, f, indent=2, ensure_ascii=False)
    print(f"\n✅ Dumped {len(all_records)} total records to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
