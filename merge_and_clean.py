import json
import csv
import os
import re

output_csv_path = '/Users/ankit/Documents/antigravity/friendly-hawking/crm_data_cleaned.csv'
chunks_dir = '/Users/ankit/Documents/antigravity/friendly-hawking'

def clean_phone(phone):
    phone_clean = re.sub(r'[\s\-\(\)\+]', '', str(phone).strip())
    # If it starts with 91 and is 12 digits, keep it or normalize to 10 digits?
    # Usually standardizing to 10 digits is preferred, but let's keep 10 digits if possible, 
    # or keep it clean.
    if len(phone_clean) == 12 and phone_clean.startswith('91'):
        phone_clean = phone_clean[2:]
    return phone_clean

def clean_email(email):
    email_clean = str(email).strip().lower()
    # Basic check
    if '@' in email_clean:
        return email_clean
    return ''

def clean_name(name):
    # Standardize capitalization of names and remove excess whitespace
    name_clean = re.sub(r'\s+', ' ', str(name).strip())
    # Capitalize words properly
    return name_clean.title()

all_records = []
missing_chunks = []

for i in range(5):
    chunk_file = os.path.join(chunks_dir, f"chunk_{i}_processed.json")
    if not os.path.exists(chunk_file):
        missing_chunks.append(f"chunk_{i}_processed.json")
        continue
        
    print(f"Loading {chunk_file}...")
    with open(chunk_file, 'r') as f:
        data = json.load(f)
        all_records.extend(data)

if missing_chunks:
    print(f"Error: The following processed chunks are missing: {missing_chunks}")
    print("Cannot proceed with merge until all chunks are processed.")
    exit(1)

print(f"Total merged records: {len(all_records)}")

# Final deduplication and formatting
seen = set()
final_records = []

resolved_city_state = 0
unresolved_city_state = 0

for r in all_records:
    name = clean_name(r['name'])
    phone = clean_phone(r['number'])
    email = clean_email(r['email'])
    city = r.get('city', '').strip()
    state = r.get('state', '').strip()
    
    # Capitalize city and state nicely
    if city:
        city = city.title()
    if state:
        state = state.title()
        
    key = (name.lower(), phone, email.lower())
    if key in seen:
        continue
    seen.add(key)
    
    if city or state:
        resolved_city_state += 1
    else:
        unresolved_city_state += 1
        
    final_records.append({
        'contact_name': name,
        'contact_number': phone,
        'contact_email': email,
        'city': city,
        'state': state
    })

print(f"Final unique records to write: {len(final_records)}")
print(f"Resolved location (city/state): {resolved_city_state}")
print(f"Unresolved location: {unresolved_city_state}")

# Write to CSV
with open(output_csv_path, 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=['contact_name', 'contact_number', 'contact_email', 'city', 'state'])
    writer.writeheader()
    writer.writerows(final_records)

print(f"Cleaned CSV successfully saved to {output_csv_path}.")
