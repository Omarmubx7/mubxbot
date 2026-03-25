import fitz
import json
import re
import os

OUTPUT_FILE = "./data/office_hours.json"

def format_time_ampm(t_str):
    # t_str is like '01:00'
    parts = t_str.split(':')
    if len(parts) != 2: return t_str
    h = int(parts[0])
    m = parts[1]
    
    if 1 <= h <= 7:
        return f"{h:02d}:{m} PM"
    elif 8 <= h <= 11:
        return f"{h:02d}:{m} AM"
    elif h == 12:
        return f"{h:02d}:{m} PM"
    
    return t_str

def parse_with_bboxes(pdf_path):
    doc = fitz.open(pdf_path)
    days = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"]
    
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
    
    cols = {}
    
    for w in words:
        text_word = w[4].strip()
        if text_word in days:
            cols[text_word] = {"x0": w[0], "x1": w[2], "center": (w[0] + w[2])/2}
            
    sorted_cols = sorted(cols.items(), key=lambda item: item[1]["center"])
    
    rows = []
    for w in words:
        text_word = w[4]
        if re.search(r'\d{1,2}:\d{2}\s*[-–]\s*\d{1,2}:\d{2}', text_word):
            rows.append({"text": text_word, "y0": w[1], "y1": w[3], "center": (w[1] + w[3])/2})
            
    rows = sorted(rows, key=lambda r: r["center"])
    
    records = []
    
    for i, row in enumerate(rows):
        top_y = row["y0"] - 5
        bottom_y = rows[i+1]["y0"] if i + 1 < len(rows) else page.rect.height
        
        row_words = [w for w in words if w[1] >= top_y and w[3] <= bottom_y]
        
        for day, col_info in sorted_cols:
            cell_words = []
            for w in row_words:
                wx = (w[0] + w[2])/2
                closest_col = min(sorted_cols, key=lambda c: abs(c[1]["center"] - wx))
                if closest_col[0] == day:
                    cell_words.append(w)
                    
            content = " ".join([w[4] for w in sorted(cell_words, key=lambda w: (w[1], w[0]))])
            
            if content.replace(' ', '') == row["text"].replace(' ', ''):
                continue
                
            is_oh = re.search(r'\bo\.?h\.?\b|office\s*hour|available|✓|☒', content, re.IGNORECASE)
            is_busy = re.search(r'\b(DSA|SDLC|CTO|Ethical|Security|FOC|Systems|Capstone|Natural|Deep|Principles|Programming|Processing|Language|Science|Data|Database|DB|Website|Hacking|Design|Network|Fundamentals)\b', content, re.IGNORECASE)
            
            if is_oh or (content.strip() and not is_busy and '-' not in content and len(content)>1):
                t_match = re.search(r'(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})', row["text"])
                if t_match:
                    start_time = format_time_ampm(t_match.group(1).replace('-', ':'))
                    end_time = format_time_ampm(t_match.group(2).replace('-', ':'))
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

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2, ensure_ascii=False)
    print(f"Dumped {len(records)} records for {pdf_path}")

if __name__ == "__main__":
    parse_with_bboxes("./data/raw/Dr Mariam Biltawi.pdf")
