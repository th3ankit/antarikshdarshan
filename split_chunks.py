import json
import os

input_path = '/Users/ankit/Documents/antigravity/friendly-hawking/extracted_raw.json'
output_dir = '/Users/ankit/Documents/antigravity/friendly-hawking'

print("Loading raw records...")
with open(input_path, 'r') as f:
    records = json.load(f)

print(f"Total raw records loaded: {len(records)}")

# Deduplicate
seen = set()
unique_records = []
for r in records:
    # Key on lowercase stripped Name, Phone number, and lowercase stripped Email
    key = (r['name'].strip().lower(), r['number'].strip(), r['email'].strip().lower())
    if key not in seen:
        seen.add(key)
        unique_records.append(r)

print(f"Unique records: {len(unique_records)}")
print(f"Duplicates removed: {len(records) - len(unique_records)}")

# Split into 5 chunks
num_chunks = 5
chunk_size = (len(unique_records) + num_chunks - 1) // num_chunks
print(f"Chunk size: {chunk_size}")

for i in range(num_chunks):
    start = i * chunk_size
    end = min(start + chunk_size, len(unique_records))
    chunk_data = unique_records[start:end]
    
    chunk_file = os.path.join(output_dir, f"chunk_{i}.json")
    with open(chunk_file, 'w') as f:
        json.dump(chunk_data, f, indent=2)
    print(f"Saved {len(chunk_data)} records to {chunk_file}")

print("Splitting completed successfully.")
