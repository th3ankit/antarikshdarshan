import sys
import json
import re
import time
from duckduckgo_search import DDGS
from indian_cities_states import parse_location_local, parse_location_by_phone, CITIES_MAP, STATE_RULES

if len(sys.argv) < 2:
    print("Usage: python3 process_chunk.py <chunk_file.json>")
    sys.exit(1)

chunk_file = sys.argv[1]
output_file = chunk_file.replace('.json', '') + '_processed.json'

print(f"Loading chunk {chunk_file}...")
with open(chunk_file, 'r') as f:
    records = json.load(f)

print(f"Loaded {len(records)} records. Starting processing...")

# Precompile regex to extract school name from name column
# E.g. "Mukesh kumar - Gd goenka aurangabad" -> "Gd goenka aurangabad"
def get_search_query(name):
    name_clean = name.strip()
    name_lower = name_clean.lower()
    
    # Check if name is purely generic/blank
    if not name_clean or 'online record not available' in name_lower or name_lower == 'page':
        return None
        
    # Split by common delimiters
    parts = re.split(r'\s*-\s*|\s*,\s*|\s*coord\s+|\s*coordinator\s*|\s*principal\s*|\s*princi\s*|\s*head\s+of\s+school\b', name_clean, flags=re.IGNORECASE)
    
    # Try to find a part that looks like a school name
    for part in parts:
        part_clean = part.strip()
        part_lower = part_clean.lower()
        if any(keyword in part_lower for keyword in ['school', 'academy', 'college', 'vidyalaya', 'public', 'convent', 'international', 'institute', 'dps', 'dav', 'gdgps', 'gd goenka']):
            return part_clean
            
    # Fallback to the longest part or the whole name
    parts = [p.strip() for p in parts if p.strip()]
    if parts:
        return max(parts, key=len)
    return name_clean

# Search function
def search_location_web(query):
    if not query:
        return '', ''
        
    search_q = f"{query} location"
    print(f"Searching web for: '{search_q}'")
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(search_q, max_results=3))
            
        # Parse search results
        for r in results:
            text_to_scan = (r['title'] + " " + r['body'] + " " + r['href']).lower()
            
            # Scan for cities
            sorted_cities = sorted(CITIES_MAP.keys(), key=len, reverse=True)
            for city_kw in sorted_cities:
                if re.search(r'\b' + re.escape(city_kw) + r'\b', text_to_scan):
                    return CITIES_MAP[city_kw]
                    
            # Scan for states
            for pattern, state in STATE_RULES:
                if pattern.search(text_to_scan):
                    return '', state
    except Exception as e:
        print(f"Web search error for '{search_q}': {e}")
        
    return '', ''

resolved_local = 0
resolved_phone = 0
resolved_web = 0
unresolved = 0

processed_records = []
for idx, r in enumerate(records):
    name = r['name'].strip()
    phone = r['number'].strip()
    email = r['email'].strip()
    
    city, state = '', ''
    
    # 1. Local Lookup
    if name:
        city, state = parse_location_local(name)
        if city and state:
            resolved_local += 1
            
    # 2. Web Search Fallback
    school_keywords = ['school', 'academy', 'college', 'vidyalaya', 'public', 'convent', 'international', 'institute', 'dps', 'dav', 'gdgps', 'gd goenka', 'mris', 'foundation']
    is_school = any(kw in name.lower() for kw in school_keywords)
    if not (city and state) and name and is_school:
        query = get_search_query(name)
        if query and len(query) > 5: # Avoid searching very short queries
            # Rate limiting delay
            time.sleep(1.0)
            web_city, web_state = search_location_web(query)
            if web_city and web_state:
                city, state = web_city, web_state
                resolved_web += 1
            elif web_state and not state:
                state = web_state
                
    # 3. Phone circle fallback (if city/state still missing)
    if not (city and state) and phone:
        phone_city, phone_state = parse_location_by_phone(phone)
        if phone_state:
            if not state:
                state = phone_state
            if not city and phone_city:
                city = phone_city
            resolved_phone += 1
            
    if not city and not state:
        unresolved += 1
        
    # Update record
    r['city'] = city
    r['state'] = state
    processed_records.append(r)
    
    if (idx + 1) % 100 == 0:
        print(f"Processed {idx+1}/{len(records)} records. Local={resolved_local}, Web={resolved_web}, Phone={resolved_phone}, Unresolved={unresolved}")

# Save output
with open(output_file, 'w') as f:
    json.dump(processed_records, f, indent=2)

print(f"Finished processing chunk {chunk_file}.")
print(f"Summary - Total: {len(records)}, Local: {resolved_local}, Web: {resolved_web}, Phone: {resolved_phone}, Unresolved: {unresolved}")
print(f"Saved processed chunk to {output_file}.")
