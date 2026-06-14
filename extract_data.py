import pypdf
import json
import os

pdf_path = '/Users/ankit/Downloads/Fresh CRM Data - Sheet3.pdf'
output_path = '/Users/ankit/Documents/antigravity/friendly-hawking/extracted_raw.json'

print("Opening PDF...")
reader = pypdf.PdfReader(pdf_path)
total_pages = len(reader.pages)
print(f"Total pages: {total_pages}")

def extract_page_elements(page, page_num):
    elements = []
    def visitor(text, cm, tm, font_dict, font_size):
        val = text.strip()
        if val:
            x = tm[4]
            y = tm[5]
            # Ignore headers/footers based on vertical coordinate range
            if not (80.0 <= y <= 760.0):
                return
            elements.append({'text': val, 'x': x, 'y': y})
    page.extract_text(visitor_text=visitor)
    return elements

def group_by_y(elements):
    rows = {}
    for el in elements:
        y_val = el['y']
        found = False
        for y_key in rows:
            if abs(y_key - y_val) < 2.0:
                rows[y_key].append(el)
                found = True
                break
        if not found:
            rows[y_val] = [el]
    return rows

all_records = []

for i in range(115):
    p1 = i + 1
    p2 = i + 116
    
    elements_1 = extract_page_elements(reader.pages[i], p1)
    elements_2 = extract_page_elements(reader.pages[i+115], p2)
    
    rows_1 = group_by_y(elements_1)
    rows_2 = group_by_y(elements_2)
    
    y_keys_1 = sorted(list(rows_1.keys()), reverse=True)
    y_keys_2 = sorted(list(rows_2.keys()), reverse=True)
    
    all_y = sorted(list(set(y_keys_1 + y_keys_2)), reverse=True)
    
    page_records = []
    for y in all_y:
        items_1 = [r for k, r in rows_1.items() if abs(k - y) < 2.0]
        items_2 = [r for k, r in rows_2.items() if abs(k - y) < 2.0]
        
        name = ' '.join([el['text'] for sublist in items_1 for el in sublist]) if items_1 else ''
        
        number = ''
        email = ''
        if items_2:
            sublist = [el for sl in items_2 for el in sl]
            sublist.sort(key=lambda el: el['x'])
            for el in sublist:
                val = el['text']
                if '@' in val or 'gmail' in val or 'yahoo' in val or 'org' in val or 'edu' in val:
                    email = val
                else:
                    number = val
        
        page_records.append({'y': y, 'name': name, 'number': number, 'email': email})
        
    merged_records = []
    idx = 0
    while idx < len(page_records):
        rec = page_records[idx]
        if rec['name'] and not rec['number'] and not rec['email'] and idx + 1 < len(page_records):
            next_rec = page_records[idx + 1]
            gap = rec['y'] - next_rec['y']
            if gap <= 15.0:
                next_rec['name'] = rec['name'] + ' ' + next_rec['name']
                idx += 1
                continue
        merged_records.append(rec)
        idx += 1
        
    all_records.extend(merged_records)

print(f"Extracted {len(all_records)} raw records.")

# Save to file
with open(output_path, 'w') as f:
    json.dump(all_records, f, indent=2)

print("Saved raw records successfully.")
