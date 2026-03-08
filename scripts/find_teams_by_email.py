#!/usr/bin/env python3
"""
Search Teams by email address to get Teams URLs
Much simpler - just reads emails and fetches Teams data!
"""

import json
import csv
from pathlib import Path
import os
import sys

def search_teams_by_email_graph():
    """
    Search Microsoft Graph for users by email address
    Automatically generates Teams URLs for all faculty
    
    Setup (5 minutes):
    1. Go to https://portal.azure.com
    2. Azure AD > App registrations > New registration
    3. Name: "Faculty Teams Finder"
    4. Get: Client ID, Tenant ID
    5. Certificates & secrets > New client secret
    6. Copy the secret value
    7. API permissions > Add permission > Microsoft Graph
    8. Grant: User.Read.All, People.Read.All
    9. Create .env file with:
       GRAPH_CLIENT_ID=your_id
       GRAPH_CLIENT_SECRET=your_secret
       GRAPH_TENANT_ID=your_tenant
    """
    try:
        import requests
        from dotenv import load_dotenv
    except ImportError:
        print("❌ Install required packages:")
        print("   pip install requests python-dotenv")
        return {}
    
    load_dotenv()
    
    client_id = os.getenv('GRAPH_CLIENT_ID')
    client_secret = os.getenv('GRAPH_CLIENT_SECRET')
    tenant_id = os.getenv('GRAPH_TENANT_ID')
    
    if not all([client_id, client_secret, tenant_id]):
        print("❌ Setup required. Create .env file with:")
        print("   GRAPH_CLIENT_ID=your_client_id")
        print("   GRAPH_CLIENT_SECRET=your_secret")
        print("   GRAPH_TENANT_ID=your_tenant")
        print("\n📖 Instructions: https://docs.microsoft.com/en-us/graph/auth-register-app-v2")
        return {}
    
    # Get access token
    try:
        token_url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
        token_data = {
            'grant_type': 'client_credentials',
            'client_id': client_id,
            'client_secret': client_secret,
            'scope': 'https://graph.microsoft.com/.default'
        }
        
        print("🔐 Getting access token...")
        token_response = requests.post(token_url, data=token_data, timeout=10)
        token_response.raise_for_status()
        access_token = token_response.json()['access_token']
        print("✓ Token acquired")
        
    except Exception as e:
        print(f"❌ Could not authenticate: {e}")
        return {}
    
    # Load emails from office_hours.json
    data_file = Path(__file__).parent.parent / "data" / "office_hours.json"
    
    try:
        with open(data_file, 'r', encoding='utf-8') as f:
            office_hours = json.load(f)
    except Exception as e:
        print(f"❌ Could not read office_hours.json: {e}")
        return {}
    
    # Get unique emails
    unique_emails = set()
    for entry in office_hours:
        email = entry.get('email', '').lower().strip()
        if email:
            unique_emails.add(email)
    
    print(f"📧 Found {len(unique_emails)} unique faculty emails")
    
    # Search for each email
    mapping = {}
    headers = {'Authorization': f'Bearer {access_token}'}
    found = 0
    not_found = []
    
    for idx, email in enumerate(sorted(unique_emails), 1):
        try:
            # Search by email
            search_url = f"https://graph.microsoft.com/v1.0/users?$filter=mail eq '{email}' or userPrincipalName eq '{email}'"
            response = requests.get(search_url, headers=headers, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            users = data.get('value', [])
            
            if users:
                user = users[0]
                user_id = user.get('id', '')
                display_name = user.get('displayName', email)
                
                if user_id:
                    # Create Teams chat URL
                    teams_url = f"https://teams.microsoft.com/l/chat/0/conversation/{user_id}"
                    mapping[email] = teams_url
                    found += 1
                    status = "✓"
                else:
                    not_found.append((email, "No user ID"))
                    status = "✗"
            else:
                not_found.append((email, "User not found"))
                status = "✗"
            
            print(f"  [{idx}/{len(unique_emails)}] {status} {email}")
            
        except Exception as e:
            not_found.append((email, str(e)))
            print(f"  [{idx}/{len(unique_emails)}] ✗ {email} - {e}")
    
    print(f"\n📊 Results:")
    print(f"   ✓ Found: {found}/{len(unique_emails)}")
    print(f"   ✗ Not found: {len(not_found)}")
    
    if not_found:
        print(f"\n⚠️  Not found:")
        for email, reason in not_found[:10]:
            print(f"   • {email} ({reason})")
        if len(not_found) > 10:
            print(f"   ... and {len(not_found) - 10} more")
    
    return mapping


def search_teams_by_email_cli():
    """
    Alternative: Use Azure CLI to search (simpler if you have CLI installed)
    
    Prerequisites:
    1. Install Azure CLI: https://docs.microsoft.com/cli/azure/install-azure-cli
    2. Run: az login
    3. Run: az account get-access-token --resource https://graph.microsoft.com
    """
    import subprocess
    
    data_file = Path(__file__).parent.parent / "data" / "office_hours.json"
    
    with open(data_file, 'r', encoding='utf-8') as f:
        office_hours = json.load(f)
    
    # Get unique emails
    unique_emails = set()
    for entry in office_hours:
        email = entry.get('email', '').lower().strip()
        if email:
            unique_emails.add(email)
    
    print(f"📧 Found {len(unique_emails)} unique faculty emails")
    print("🔐 Getting access token via Azure CLI...")
    
    try:
        # Get token from Azure CLI
        result = subprocess.run(
            ['az', 'account', 'get-access-token', '--resource', 'https://graph.microsoft.com', '--query', 'accessToken', '-o', 'tsv'],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode != 0:
            print(f"❌ Azure CLI error: {result.stderr}")
            print("   Make sure you ran: az login")
            return {}
        
        access_token = result.stdout.strip()
        print("✓ Token acquired")
        
    except Exception as e:
        print(f"❌ Could not get token: {e}")
        print("   Install Azure CLI: https://docs.microsoft.com/cli/azure/install-azure-cli")
        return {}
    
    # Search for each email
    import requests
    mapping = {}
    headers = {'Authorization': f'Bearer {access_token}'}
    found = 0
    not_found = []
    
    for idx, email in enumerate(sorted(unique_emails), 1):
        try:
            search_url = f"https://graph.microsoft.com/v1.0/users?$filter=mail eq '{email}' or userPrincipalName eq '{email}'"
            response = requests.get(search_url, headers=headers, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            users = data.get('value', [])
            
            if users:
                user = users[0]
                user_id = user.get('id', '')
                
                if user_id:
                    teams_url = f"https://teams.microsoft.com/l/chat/0/conversation/{user_id}"
                    mapping[email] = teams_url
                    found += 1
                    print(f"  [{idx}/{len(unique_emails)}] ✓ {email}")
                else:
                    not_found.append(email)
                    print(f"  [{idx}/{len(unique_emails)}] ✗ {email}")
            else:
                not_found.append(email)
                print(f"  [{idx}/{len(unique_emails)}] ✗ {email} (not found)")
        
        except Exception as e:
            not_found.append(email)
            print(f"  [{idx}/{len(unique_emails)}] ✗ {email} ({e})")
    
    print(f"\n✓ Found: {found}/{len(unique_emails)}")
    if not_found:
        print(f"✗ Not found: {len(not_found)}")
    
    return mapping


def save_mapping_to_csv(mapping):
    """Save to teams_mapping.csv"""
    output_path = Path(__file__).parent / "teams_mapping.csv"
    
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['email', 'teams_url'])
        for email, url in sorted(mapping.items()):
            writer.writerow([email, url])
    
    print(f"✓ Saved {len(mapping)} URLs to teams_mapping.csv")
    return output_path


if __name__ == "__main__":
    print("Teams Email Lookup")
    print("=" * 60)
    
    method = "graph"  # Default to Graph API
    if len(sys.argv) > 1:
        method = sys.argv[1].lower()
    
    if method == "cli":
        print("\n📡 Searching by email using Azure CLI...\n")
        mapping = search_teams_by_email_cli()
    else:
        print("\n📡 Searching by email using Microsoft Graph API...\n")
        mapping = search_teams_by_email_graph()
    
    if mapping:
        csv_file = save_mapping_to_csv(mapping)
        print(f"\n✓ Done! Now run:")
        print(f"   python add_teams_urls.py")
    else:
        print("\n⚠️  No emails found. Check setup and try again.")
