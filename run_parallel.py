import subprocess
import sys
import time

print("Starting parallel processing of chunks...")

processes = []
for i in range(5):
    cmd = ["./venv/bin/python3", "process_chunk.py", f"chunk_{i}.json"]
    print(f"Launching worker for chunk_{i}.json...")
    p = subprocess.Popen(cmd)
    processes.append(p)

print("All workers launched. Waiting for completion...")

# Poll for completion
while True:
    active = 0
    for p in processes:
        if p.poll() is None:
            active += 1
    if active == 0:
        break
    print(f"{active} workers still running...")
    time.sleep(5)

print("All workers finished processing!")

# Check exit codes
failed = False
for idx, p in enumerate(processes):
    if p.returncode != 0:
        print(f"Error: Worker {idx} failed with exit code {p.returncode}")
        failed = True

if failed:
    print("One or more workers failed. Merge aborted.")
    sys.exit(1)

print("Merging results...")
subprocess.run(["./venv/bin/python3", "merge_and_clean.py"])
print("Pipeline finished successfully!")
