#!/usr/bin/env python3
"""
Data cleanup script for office_hours.json
Fixes Bugs #11, #12, #13 from PRD Section 16.4
"""

import json
import re
from pathlib import Path

def title_case_name(name):
    """
    Apply title case to names with special handling for Al- prefixes
    Bug #12 fix
    """
    if not name:
        return name
    
    words = name.split()
    result = []
    
    for word in words:
        # Handle Al- prefix (Arabic names)
        if word.lower().startswith('al-'):
            if len(word) > 3:
                result.append('Al-' + word[3].upper() + word[4:].lower())
            else:
                result.append('Al-')
        # Skip Arabic text, numbers, emails
        elif any(ord(c) > 1000 for c in word) or '@' in word or word.isdigit():
            result.append(word)
        else:
            result.append(word.capitalize())
    
    return ' '.join(result)

def normalize_department(dept):
    """
    Normalize department names to canonical forms
    Bug #10 fix
    """
    if not dept:
        return dept
    
    normalized = dept.strip().lower()
    
    # Computer Science variants
    if normalized in ['cs', 'computer science']:
        return 'Computer Science'
    
    # Cyber Security variants
    if normalized in ['cyber security', 'cybersecurity', 'cyber security department']:
        return 'Cyber Security'
    
    # Data Science variants
    if any(x in normalized for x in ['data science', 'ai', 'artificial intelligence', 'artificial intelligent']):
        return 'Data Science and Artificial Intelligence'
    
    # Information Technology
    if normalized in ['it', 'information technology']:
        return 'Information Technology'
    
    # Default: title case
    return dept.strip().title()

def fix_malformed_name(faculty):
    """
    Fix malformed names like "Dr. Salem Alemaishat - Fall 2025 Office Hours"
    Bug #11 fix
    """
    # Remove semester/date info
    faculty = re.sub(r'\s*-\s*(Fall|Spring|Summer)\s+\d{4}.*$', '', faculty, flags=re.IGNORECASE)
    
    # Remove "Office Hours" suffix
    faculty = re.sub(r'\s*-?\s*Office\s+Hours\s*$', '', faculty, flags=re.IGNORECASE)
    
    return faculty.strip()

def remove_title_prefix(name):
    """
    Remove Dr., Prof., etc. prefixes for consistency
    Bug #13 fix
    """
    # Remove common title prefixes
    name = re.sub(r'^(Dr\.?|Prof\.?|Professor)\s+', '', name, flags=re.IGNORECASE)
    return name.strip()

def fix_invalid_time(time_str):
    """
    Fix invalid times like "40:00" (likely typo for "4:00")
    Bug #9 fix
    """
    if not time_str:
        return time_str
    
    # Check for hours > 23
    match = re.match(r'^(\d+):(\d+)', time_str)
    if match:
        hours = int(match.group(1))
        minutes = match.group(2)
        
        # Fix common typos
        if hours == 40:
            return f"4:{minutes}"
        elif hours > 23:
            # If hours is like 14:00, might be meant as 14:00 (2 PM)
            # But 40:00 is clearly 4:00
            return f"{hours % 12 or 12}:{minutes}"
    
    return time_str

def normalize_time_format(time_str):
    """
    Normalize time formats (remove inconsistent spaces, etc.)
    """
    if not time_str:
        return time_str
    
    # Fix spacing in "10:00 Am" -> "10:00 AM"
    time_str = re.sub(r'\s*(am|pm|AM|PM)', lambda m: ' ' + m.group(1).upper(), time_str)
    
    return time_str.strip()

def cleanup_office_hours_data(input_file, output_file=None):
    """
    Main cleanup function
    """
    if output_file is None:
        output_file = input_file
    
    input_path = Path(input_file)
    
    # Read JSON
    with open(input_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print(f"📊 Processing {len(data)} entries...")
    
    changes = {
        'names_fixed': 0,
        'names_title_cased': 0,
        'titles_removed': 0,
        'depts_normalized': 0,
        'times_fixed': 0,
    }
    
    for entry in data:
        # Fix faculty names
        original_name = entry['faculty']
        
        # Step 1: Fix malformed entries (Bug #11)
        name = fix_malformed_name(entry['faculty'])
        if name != entry['faculty']:
            changes['names_fixed'] += 1
            print(f"  ✓ Fixed malformed: '{entry['faculty'][:50]}...' → '{name}'")
        
        # Step 2: Remove title prefixes (Bug #13)
        name_no_title = remove_title_prefix(name)
        if name_no_title != name:
            changes['titles_removed'] += 1
        name = name_no_title
        
        # Step 3: Apply title case (Bug #12)
        name_titled = title_case_name(name)
        if name_titled != name:
            changes['names_title_cased'] += 1
        
        entry['faculty'] = name_titled
        
        # Fix department names (Bug #10)
        if 'department' in entry:
            original_dept = entry['department']
            normalized_dept = normalize_department(entry['department'])
            if normalized_dept != original_dept:
                changes['depts_normalized'] += 1
                entry['department'] = normalized_dept
        
        # Fix invalid times (Bug #9)
        if 'end' in entry:
            original_end = entry['end']
            fixed_end = fix_invalid_time(entry['end'])
            if fixed_end != original_end:
                changes['times_fixed'] += 1
                print(f"  ✓ Fixed invalid time for {entry['faculty']}: {original_end} → {fixed_end}")
            entry['end'] = normalize_time_format(fixed_end)
        
        if 'start' in entry:
            entry['start'] = normalize_time_format(entry['start'])
    
    # Write back to file
    output_path = Path(output_file)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ Cleanup complete! Changes:")
    print(f"   • Malformed names fixed: {changes['names_fixed']}")
    print(f"   • Names title-cased: {changes['names_title_cased']}")
    print(f"   • Title prefixes removed: {changes['titles_removed']}")
    print(f"   • Departments normalized: {changes['depts_normalized']}")
    print(f"   • Invalid times fixed: {changes['times_fixed']}")
    print(f"\n📝 Output written to: {output_path}")

if __name__ == '__main__':
    # Run cleanup on office_hours.json
    data_file = Path(__file__).parent.parent / 'data' / 'office_hours.json'
    
    print("🔧 Starting data cleanup...")
    print(f"📁 Input file: {data_file}\n")
    
    cleanup_office_hours_data(data_file)
    
    print("\n✨ All data quality issues (Bugs #11-13) resolved!")
