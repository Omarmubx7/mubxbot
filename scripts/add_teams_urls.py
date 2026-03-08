#!/usr/bin/env python3
"""
Script to add Teams URLs to office_hours.json
Options:
1. Generate Teams URLs from email handles (extract from email prefix)
2. Use a mapping file with email -> teams_url
"""

import json
import os
from pathlib import Path

# Path to office hours data
DATA_FILE = Path(__file__).parent.parent / "data" / "office_hours.json"

# Teams URL base (you can customize this based on your Teams setup)
# Option 1: Generic Teams chat opening pattern (requires manual entry after)
TEAMS_URL_TEMPLATE = "https://teams.microsoft.com/l/chat/0/conversation/"

# Option 2: If you have a Teams handle from email, you could use:
# TEAMS_URL_TEMPLATE = "https://teams.microsoft.com/l/chat/{handle}"

def get_teams_url_from_email(email):
    """
    Extract Teams handle from email and generate URL
    Example: ashar.khamaiseh@htu.edu.jo -> ashar.khamaiseh
    """
    if not email:
        return ""
    # Extract part before @
    handle = email.split("@")[0]
    # Generate Teams URL (adjust pattern based on your Teams setup)
    return f"https://teams.microsoft.com/l/chat/0/conversation/"

def load_mapping_file():
    """
    Load email -> teams_url mapping from a CSV file
    Expected format: email,teams_url
    Example: ashar.khamaiseh@htu.edu.jo,https://teams.microsoft.com/l/chat/...
    """
    mapping_file = Path(__file__).parent / "teams_mapping.csv"
    mapping = {}
    
    if mapping_file.exists():
        with open(mapping_file, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    parts = line.split(',', 1)
                    if len(parts) == 2:
                        email, url = parts[0].strip(), parts[1].strip()
                        mapping[email] = url
    
    return mapping

def add_teams_urls(use_mapping=False):
    """
    Add teams_url field to all office hours entries
    """
    if not DATA_FILE.exists():
        print(f"Error: {DATA_FILE} not found")
        return
    
    # Load data
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        office_hours = json.load(f)
    
    # Load mapping if available
    mapping = load_mapping_file() if use_mapping else {}
    
    # Track statistics
    updated_count = 0
    missing_urls = []
    unique_faculty = {}
    
    # Add teams_url to each entry
    for entry in office_hours:
        if 'teams_url' not in entry:
            email = entry.get('email', '')
            faculty = entry.get('faculty', '')
            
            # Get URL from mapping or generate
            if email in mapping:
                teams_url = mapping[email]
                updated_count += 1
            elif email:
                # Store faculty with email for manual addition
                if email not in unique_faculty:
                    unique_faculty[email] = faculty
                teams_url = ""
            else:
                teams_url = ""
            
            entry['teams_url'] = teams_url
    
    # Save updated data
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(office_hours, f, indent=2, ensure_ascii=False)
    
    print(f"✓ Updated office_hours.json with teams_url field")
    print(f"✓ URLs populated from mapping: {updated_count}")
    print(f"✓ Unique faculty needing URLs: {len(unique_faculty)}")
    
    if unique_faculty and not use_mapping:
        print("\n📝 Create 'teams_mapping.csv' in scripts/ with format:")
        print("email,teams_url")
        print("# Example:")
        for email, faculty in list(unique_faculty.items())[:3]:
            print(f"{email},https://teams.microsoft.com/l/chat/0/conversation/...")
        
        print(f"\n📋 All {len(unique_faculty)} faculty emails:")
        for email in sorted(unique_faculty.keys()):
            print(f"  {email}")

if __name__ == "__main__":
    import sys
    
    # Check if mapping file exists
    mapping_file = Path(__file__).parent / "teams_mapping.csv"
    use_mapping = mapping_file.exists()
    
    print("Teams URL Adder")
    print("=" * 50)
    
    if use_mapping:
        print(f"Found teams_mapping.csv - will use URL mappings")
    else:
        print("No teams_mapping.csv found")
        print("Create one with format: email,teams_url")
    
    add_teams_urls(use_mapping=use_mapping)
