#!/usr/bin/env python3
"""
Teams URL Collector - No Admin Required
Simple approach: Open Teams for each faculty email so you can quickly copy their chat links
"""

import json
import csv
import webbrowser
from pathlib import Path
from urllib.parse import quote

def open_teams_search(email):
    """Open Teams web search for this email"""
    # Teams web URL to search for user
    teams_search_url = f"https://teams.microsoft.com/l/chat/0/conversation/"
    
    # Alternative: Open Teams with search term
    search_query = email.split('@')[0]  # Get just the part before @
    teams_url = f"https://teams.microsoft.com/_#/search/{quote(search_query)}"
    
    print(f"\n🔗 Opening Teams for: {email}")
    print(f"   Search term: {search_query}")
    webbrowser.open(teams_url)
    
    return search_query

def manual_url_entry():
    """
    Manual entry mode: User provides Teams URLs, we extract emails and map them
    """
    print("\n" + "="*60)
    print("Manual Teams URL Entry Mode")
    print("="*60)
    print("""
How to get a Teams chat URL:
1. Open Microsoft Teams
2. Search for faculty member (e.g., "Ashar") or click their name
3. Click "Start a chat" or "Profile"
4. Copy the URL from your browser address bar
5. Paste it below

Example URL:
https://teams.microsoft.com/l/chat/0/conversation/19:abc123def456@thread.tacv2

Paste URLs one by one. Type 'done' when finished.
    """)
    
    data_file = Path(__file__).parent.parent / "data" / "office_hours.json"
    with open(data_file, 'r', encoding='utf-8') as f:
        office_hours = json.load(f)
    
    # Get unique emails
    unique_emails = {entry.get('email', '').lower().strip(): entry.get('faculty', '') 
                     for entry in office_hours if entry.get('email')}
    
    email_list = sorted(unique_emails.keys())
    
    mapping = {}
    
    for idx, email in enumerate(email_list, 1):
        faculty_name = unique_emails[email]
        
        print(f"\n[{idx}/{len(email_list)}] {faculty_name}")
        print(f"    Email: {email}")
        print(f"    Paste Teams URL (or skip): ", end='', flush=True)
        
        user_input = input().strip()
        
        if not user_input:
            print("    ⊘ Skipped")
            continue
        
        if user_input.lower() == 'done':
            break
        
        # Extract user ID from URL
        # URL format: https://teams.microsoft.com/l/chat/0/conversation/19:abc123@thread.tacv2
        if 'conversation/' in user_input:
            try:
                user_id = user_input.split('conversation/')[-1]
                # Clean up - take just the ID part
                user_id = user_id.split('?')[0]
                mapping[email] = f"https://teams.microsoft.com/l/chat/0/conversation/{user_id}"
                print(f"    ✓ Mapped: {email}")
            except Exception as e:
                print(f"    ✗ Could not parse URL: {e}")
        else:
            print(f"    ✗ Invalid URL format")
    
    return mapping

def auto_open_browser_mode():
    """
    Auto mode: Open Teams search for each faculty email
    User manually copies URLs and we collect them
    """
    print("\n" + "="*60)
    print("Browser Auto-Open Mode")
    print("="*60)
    
    data_file = Path(__file__).parent.parent / "data" / "office_hours.json"
    with open(data_file, 'r', encoding='utf-8') as f:
        office_hours = json.load(f)
    
    # Get unique emails
    unique_emails = {entry.get('email', '').lower().strip(): entry.get('faculty', '') 
                     for entry in office_hours if entry.get('email')}
    
    email_list = sorted(unique_emails.keys())
    
    mapping = {}
    
    print(f"\nFound {len(email_list)} faculty emails")
    print("\nFor each faculty member:")
    print("1. I'll open Teams search in your browser")
    print("2. Click their name and select 'Start a chat'")
    print("3. Copy the URL that appears")
    print("4. Come back and paste it here")
    
    for idx, email in enumerate(email_list, 1):
        faculty_name = unique_emails[email]
        search_term = email.split('@')[0]
        
        print(f"\n[{idx}/{len(email_list)}] {faculty_name} ({email})")
        print(f"    Opening Teams search for: {search_term}")
        
        # Open Teams web search
        teams_url = f"https://teams.microsoft.com/_#/search/{quote(search_term)}"
        webbrowser.open(teams_url)
        
        print(f"    Paste copied chat URL (or skip): ", end='', flush=True)
        user_input = input().strip()
        
        if not user_input:
            print("    ⊘ Skipped")
            continue
        
        # Extract user ID from URL
        if 'conversation/' in user_input:
            try:
                user_id = user_input.split('conversation/')[-1].split('?')[0]
                mapping[email] = f"https://teams.microsoft.com/l/chat/0/conversation/{user_id}"
                print(f"    ✓ Saved")
            except Exception as e:
                print(f"    ✗ Error: {e}")
        else:
            print(f"    ✗ Invalid URL")
    
    return mapping

def csv_to_mapping():
    """
    Read from CSV file that user populated manually
    Format: email,teams_url
    """
    csv_file = Path(__file__).parent / "teams_urls_input.csv"
    
    if not csv_file.exists():
        print(f"❌ File not found: {csv_file}")
        print("Create a CSV file with format:")
        print("  email,teams_url")
        print("  ashar.khamaiseh@htu.edu.jo,https://teams.microsoft.com/l/chat/0/conversation/19:abc123@thread.tacv2")
        return {}
    
    mapping = {}
    try:
        with open(csv_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                email = row.get('email', '').strip().lower()
                url = row.get('teams_url', '').strip()
                if email and url:
                    mapping[email] = url
        
        print(f"✓ Loaded {len(mapping)} URLs from {csv_file}")
        return mapping
    except Exception as e:
        print(f"❌ Error reading CSV: {e}")
        return {}

def save_mapping_to_csv(mapping):
    """Save collected URLs to teams_mapping.csv"""
    output_path = Path(__file__).parent / "teams_mapping.csv"
    
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['email', 'teams_url'])
        for email, url in sorted(mapping.items()):
            writer.writerow([email, url])
    
    print(f"\n✓ Saved {len(mapping)} URLs to teams_mapping.csv")
    return output_path

if __name__ == "__main__":
    print("="*60)
    print("Teams URL Collector - No Admin Required")
    print("="*60)
    
    print("\nChoose a method:")
    print("  1. Manual Entry - Paste URLs directly")
    print("  2. Auto-Open Browser - I open Teams for each faculty")
    print("  3. Load from CSV - I already created teams_urls_input.csv")
    
    choice = input("\nEnter option (1-3): ").strip()
    
    mapping = {}
    
    if choice == "1":
        print("\n📝 Manual Entry Mode")
        mapping = manual_url_entry()
    
    elif choice == "2":
        print("\n🌐 Browser Mode")
        try:
            from urllib.parse import quote
            mapping = auto_open_browser_mode()
        except Exception as e:
            print(f"❌ Error: {e}")
    
    elif choice == "3":
        print("\n📄 CSV Mode")
        mapping = csv_to_mapping()
    
    else:
        print("❌ Invalid choice")
        exit(1)
    
    if mapping:
        save_mapping_to_csv(mapping)
        print(f"\n✓ Next step: python add_teams_urls.py")
    else:
        print(f"\n⚠️  No URLs collected")
