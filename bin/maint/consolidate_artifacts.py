import os
import re
import shutil
from datetime import datetime, timedelta

# Cutoff: 72 hours ago
CUTOFF_HOURS = 72
now = datetime.now()
cutoff_date = now - timedelta(hours=CUTOFF_HOURS)

ARCHIVE_DIRS = [
    "artifacts/playthrough",
    "artifacts/playthrough-api",
    "artifacts/playthrough-api-ci-smoke",
    "artifacts/playthrough-api-task129-smoke",
    "artifacts/playthrough-api-verify",
    "artifacts/playthrough-ui",
    "artifacts/test-run",
    "artifacts/screenshots"
]

def get_date_from_name(name):
    # Match YYYY-MM-DD
    match = re.search(r'(\d{4})-(\d{2})-(\d{2})', name)
    if match:
        try:
            return datetime.strptime(match.group(0), '%Y-%m-%d')
        except ValueError:
            pass
    
    # Match 13-digit timestamp (ms)
    match = re.search(r'(\d{13})', name)
    if match:
        ts = int(match.group(1)) / 1000.0
        return datetime.fromtimestamp(ts)
    
    return None

def consolidate():
    base_path = os.getcwd()
    for archive_dir in ARCHIVE_DIRS:
        full_archive_dir = os.path.join(base_path, archive_dir)
        if not os.path.exists(full_archive_dir):
            continue
            
        print(f"Checking {archive_dir}...")
        
        # Sort entries to process in a stable order
        entries = sorted(os.listdir(full_archive_dir))
        
        processed_days = set()
        
        for entry in entries:
            if entry.startswith('.'):
                continue
                
            entry_path = os.path.join(full_archive_dir, entry)
            
            # Skip if it's already a 4-digit directory (already archived)
            if len(entry) == 4 and entry.isdigit() and os.path.isdir(entry_path):
                continue
            
            # Determine date
            entry_date = get_date_from_name(entry)
            if not entry_date:
                # Fallback to mtime for older artifacts without date/timestamp in name
                mtime = os.path.getmtime(entry_path)
                entry_date = datetime.fromtimestamp(mtime)
            
            if entry_date < cutoff_date:
                # Consolidate into YYYY/MM/DD
                y = entry_date.strftime('%Y')
                m = entry_date.strftime('%m')
                d = entry_date.strftime('%d')
                
                target_dir = os.path.join(full_archive_dir, y, m, d)
                os.makedirs(target_dir, exist_ok=True)
                
                processed_days.add((archive_dir, y, m, d))
                
                try:
                    target_path = os.path.join(target_dir, entry)
                    if os.path.exists(target_path):
                        print(f"  Collision for {entry}, skipping.")
                        continue
                        
                    shutil.move(entry_path, target_path)
                except Exception as e:
                    print(f"  Error moving {entry}: {e}")

        # Compression Step
        # Find all YYYY/MM/DD directories and compress them
        for archive_dir in ARCHIVE_DIRS:
            full_archive_dir = os.path.join(base_path, archive_dir)
            if not os.path.exists(full_archive_dir):
                continue
            
            # Walk the YYYY/MM/DD structure
            for y in [d for d in os.listdir(full_archive_dir) if len(d) == 4 and d.isdigit()]:
                y_path = os.path.join(full_archive_dir, y)
                for m in [d for d in os.listdir(y_path) if len(d) == 2 and d.isdigit()]:
                    m_path = os.path.join(y_path, m)
                    for d in [d for d in os.listdir(m_path) if len(d) == 2 and d.isdigit()]:
                        d_path = os.path.join(m_path, d)
                        if not os.path.isdir(d_path):
                            continue
                            
                        tar_file = f"{d}.tar.gz"
                        tar_path = os.path.join(m_path, tar_file)
                        
                        print(f"  Compressing {archive_dir}/{y}/{m}/{d} -> {tar_file}")
                        # Use tar command for efficiency and to preserve permissions easily
                        cmd = f"tar -czf \"{tar_path}\" -C \"{m_path}\" \"{d}\""
                        if os.system(cmd) == 0:
                            shutil.rmtree(d_path)
                        else:
                            print(f"  Failed to compress {d_path}")

if __name__ == "__main__":
    print(f"Consolidating artifacts older than {cutoff_date.isoformat()}...")
    consolidate()
    print("Done.")
