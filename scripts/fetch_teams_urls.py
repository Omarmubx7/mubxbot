#!/usr/bin/env python3
"""
Fetch Teams URLs from Microsoft Graph API or Teams directory
Requires: Microsoft Graph API access or Teams admin credentials
"""

import json
import csv
from pathlib import Path
import os

# ============================================================================
# OPTION 1: Using Microsoft Graph API (Requires Azure App Registration)
# ============================================================================

def fetch_teams_urls_from_graph():
    """
    Fetch Teams user URLs from Microsoft Graph API
    
    Prerequisites:
    1. Register app in Azure AD: https://portal.azure.com
    2. Get: Client ID, Client Secret, Tenant ID
    3. Create .env file with:
       GRAPH_CLIENT_ID=your_client_id
       GRAPH_CLIENT_SECRET=your_secret
       GRAPH_TENANT_ID=your_tenant
    4. Grant "User.Read.All" permission in API permissions
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
        print("⚠️  Graph API credentials not found in .env")
        print("   Create .env file with GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET, GRAPH_TENANT_ID")
        return {}
    
    try:
        # Get access token
        token_url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
        token_data = {
            'grant_type': 'client_credentials',
            'client_id': client_id,
            'client_secret': client_secret,
            'scope': 'https://graph.microsoft.com/.default'
        }
        
        token_response = requests.post(token_url, data=token_data)
        token_response.raise_for_status()
        access_token = token_response.json()['access_token']
        
        # Get all users
        headers = {'Authorization': f'Bearer {access_token}'}
        users_url = "https://graph.microsoft.com/v1.0/users?$select=email,id,userPrincipalName"
        
        mapping = {}
        while users_url:
            response = requests.get(users_url, headers=headers)
            response.raise_for_status()
            data = response.json()
            
            for user in data.get('value', []):
                email = user.get('mail') or user.get('userPrincipalName', '')
                user_id = user.get('id', '')
                
                if email and user_id:
                    # Generate Teams chat URL
                    teams_url = f"https://teams.microsoft.com/l/chat/0/conversation/{user_id}"
                    mapping[email.lower()] = teams_url
            
            # Get next page
            users_url = data.get('@odata.nextLink')
        
        print(f"✓ Fetched {len(mapping)} Teams users from Microsoft Graph")
        return mapping
        
    except Exception as e:
        print(f"❌ Graph API error: {e}")
        print("   Make sure credentials are correct and app has User.Read.All permission")
        return {}

# ============================================================================
# OPTION 2: Using Teams PowerShell Module (Windows Only)
# ============================================================================

def fetch_teams_urls_from_powershell():
    """
    Fetch Teams URLs using Teams PowerShell module on Windows
    
    Prerequisites (Windows only):
    1. Install Teams PowerShell Module:
       Install-Module -Name MicrosoftTeams -Force -AllowClobber
    2. Must have Teams admin or appropriate permissions
    """
    import subprocess
    import sys
    
    if sys.platform != "win32":
        print("⚠️  PowerShell method only works on Windows")
        return {}
    
    ps_script = """
    $ErrorActionPreference = 'Stop'
    try {
        # Connect to Teams (interactive login)
        Connect-MicrosoftTeams | Out-Null
        
        # Get all users
        $users = Get-CsOnlineUser -Filter "InterpretAsPhoneNumber -eq `$false" | Select-Object UserPrincipalName, Identity
        
        $mapping = @{}
        foreach ($user in $users) {
            $email = $user.UserPrincipalName.ToLower()
            $userId = $user.Identity -replace 'urn:uuid:', ''
            $teamsUrl = "https://teams.microsoft.com/l/chat/0/conversation/$userId"
            $mapping[$email] = $teamsUrl
        }
        
        # Output as JSON
        $mapping | ConvertTo-Json
    }
    catch {
        Write-Error $_.Exception.Message
    }
    """
    
    try:
        result = subprocess.run(
            ['powershell', '-Command', ps_script],
            capture_output=True,
            text=True,
            timeout=60
        )
        
        if result.returncode == 0:
            mapping = json.loads(result.stdout)
            print(f"✓ Fetched {len(mapping)} Teams users from PowerShell")
            return mapping
        else:
            print(f"❌ PowerShell error: {result.stderr}")
            return {}
    except Exception as e:
        print(f"❌ Could not execute PowerShell: {e}")
        return {}

# ============================================================================
# OPTION 3: Generate placeholder URLs from email (Simple, No API needed)
# ============================================================================

def generate_placeholder_urls_from_emails():
    """
    Generate placeholder Teams URLs based on email addresses
    These won't be real until you populate with actual Teams user IDs
    
    Format: ashar.khamaiseh@htu.edu.jo -> ashar.khamaiseh (teams handle)
    """
    data_file = Path(__file__).parent.parent / "data" / "office_hours.json"
    
    with open(data_file, 'r', encoding='utf-8') as f:
        office_hours = json.load(f)
    
    mapping = {}
    for entry in office_hours:
        email = entry.get('email', '').lower()
        if email and email not in mapping:
            # Extract part before @ as Teams handle
            handle = email.split('@')[0]
            # Create a placeholder - you'll need to map to actual Teams IDs
            teams_url = f"https://teams.microsoft.com/l/chat/0/conversation/{handle}"
            mapping[email] = teams_url
    
    print(f"✓ Generated {len(mapping)} placeholder URLs from emails")
    return mapping

# ============================================================================
# Save to CSV
# ============================================================================

def save_mapping_to_csv(mapping, output_file="teams_mapping.csv"):
    """Save email->URL mapping to CSV file"""
    output_path = Path(__file__).parent / output_file
    
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['email', 'teams_url'])
        for email, url in sorted(mapping.items()):
            writer.writerow([email, url])
    
    print(f"✓ Saved {len(mapping)} URLs to {output_file}")

# ============================================================================
# Main
# ============================================================================

if __name__ == "__main__":
    import sys
    
    print("Teams URL Bulk Fetcher")
    print("=" * 60)
    
    if len(sys.argv) > 1:
        option = sys.argv[1].lower()
    else:
        print("\nChoose an option:")
        print("  1. Microsoft Graph API (recommended, requires setup)")
        print("  2. Teams PowerShell (Windows only)")
        print("  3. Generate placeholders from emails (no setup needed)")
        option = input("\nEnter option (1-3): ").strip()
    
    mapping = {}
    
    if option in ['1', 'graph']:
        print("\n📡 Fetching from Microsoft Graph API...")
        mapping = fetch_teams_urls_from_graph()
    
    elif option in ['2', 'powershell']:
        print("\n📡 Fetching from Teams PowerShell...")
        mapping = fetch_teams_urls_from_powershell()
    
    elif option in ['3', 'placeholder']:
        print("\n📡 Generating placeholder URLs...")
        mapping = generate_placeholder_urls_from_emails()
    
    else:
        print("❌ Invalid option")
        sys.exit(1)
    
    if mapping:
        save_mapping_to_csv(mapping)
        print(f"\n✓ Done! {len(mapping)} URLs ready")
        print("Next step: python add_teams_urls.py")
    else:
        print("\n⚠️  No URLs fetched. Check setup and try again.")
