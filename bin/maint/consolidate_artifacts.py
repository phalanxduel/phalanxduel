import os
import re
import sys
import shutil
import argparse
from datetime import datetime, timedelta

# Cutoff: 72 hours ago (for consolidation)
CUTOFF_HOURS = 72
now = datetime.now()
cutoff_date = now - timedelta(hours=CUTOFF_HOURS)

DEFAULT_ARCHIVE_DIRS = [
    "artifacts/playthrough",
    "artifacts/playthrough-api",
    "artifacts/playthrough-api-ci-smoke",
    "artifacts/playthrough-api-task129-smoke",
    "artifacts/playthrough-api-verify",
    "artifacts/playthrough-ui",
    "artifacts/test-run",
    "artifacts/screenshots"
]

def get_archive_dirs(base_path):
    artifacts_dir = os.path.join(base_path, "artifacts")
    if not os.path.exists(artifacts_dir):
        return []
    dirs = set(DEFAULT_ARCHIVE_DIRS)
    for entry in os.listdir(artifacts_dir):
        if entry.startswith('.'):
            continue
        full_path = os.path.join(artifacts_dir, entry)
        if os.path.isdir(full_path):
            dirs.add(os.path.join("artifacts", entry))
    return sorted(list(dirs))


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

def consolidate(purge_days=None):
    base_path = os.getcwd()
    purge_cutoff = (now - timedelta(days=purge_days)) if purge_days is not None else None
    archive_dirs = get_archive_dirs(base_path)

    # Step 1: Consolidate unarchived items into YYYY/MM/DD
    for archive_dir in archive_dirs:
        full_archive_dir = os.path.join(base_path, archive_dir)
        if not os.path.exists(full_archive_dir):
            continue
            
        print(f"Checking {archive_dir}...")
        entries = sorted(os.listdir(full_archive_dir))
        
        for entry in entries:
            if entry.startswith('.'):
                continue
                
            entry_path = os.path.join(full_archive_dir, entry)
            
            # Skip if it's already a 4-digit directory (already archived)
            if len(entry) == 4 and entry.isdigit() and os.path.isdir(entry_path):
                continue
            
            entry_date = get_date_from_name(entry)
            if not entry_date:
                entry_date = get_date_from_name(archive_dir)
            if not entry_date:
                mtime = os.path.getmtime(entry_path)
                entry_date = datetime.fromtimestamp(mtime)
            
            # Purge if older than purge_cutoff
            if purge_cutoff and entry_date < purge_cutoff:
                print(f"  Purging expired item {archive_dir}/{entry}")
                try:
                    if os.path.isdir(entry_path):
                        shutil.rmtree(entry_path)
                    else:
                        os.remove(entry_path)
                except Exception as e:
                    print(f"  Error purging {entry}: {e}")
                continue

            if entry_date < cutoff_date:
                y = entry_date.strftime('%Y')
                m = entry_date.strftime('%m')
                d = entry_date.strftime('%d')
                
                target_dir = os.path.join(full_archive_dir, y, m, d)
                os.makedirs(target_dir, exist_ok=True)
                
                try:
                    target_path = os.path.join(target_dir, entry)
                    if os.path.exists(target_path):
                        print(f"  Collision for {entry}, skipping.")
                        continue
                        
                    shutil.move(entry_path, target_path)
                except Exception as e:
                    print(f"  Error moving {entry}: {e}")

    # Step 2: Compression & Purging of YYYY/MM/DD archives
    for archive_dir in archive_dirs:
        full_archive_dir = os.path.join(base_path, archive_dir)
        if not os.path.exists(full_archive_dir):
            continue
        
        for y in [d for d in os.listdir(full_archive_dir) if len(d) == 4 and d.isdigit()]:
            y_path = os.path.join(full_archive_dir, y)
            for m in [d for d in os.listdir(y_path) if len(d) == 2 and d.isdigit()]:
                m_path = os.path.join(y_path, m)
                for d in [d for d in os.listdir(m_path) if len(d) == 2 and d.isdigit()]:
                    d_path = os.path.join(m_path, d)
                    if not os.path.isdir(d_path):
                        continue
                        
                    try:
                        dir_date = datetime.strptime(f"{y}-{m}-{d}", '%Y-%m-%d')
                        if purge_cutoff and dir_date < purge_cutoff:
                            print(f"  Purging expired archived folder {archive_dir}/{y}/{m}/{d}")
                            shutil.rmtree(d_path)
                            continue
                    except ValueError:
                        pass

                    tar_file = f"{d}.tar.gz"
                    tar_path = os.path.join(m_path, tar_file)
                    
                    print(f"  Compressing {archive_dir}/{y}/{m}/{d} -> {tar_file}")
                    cmd = f"tar -czf \"{tar_path}\" -C \"{m_path}\" \"{d}\""
                    if os.system(cmd) == 0:
                        shutil.rmtree(d_path)
                    else:
                        print(f"  Failed to compress {d_path}")

                # Also check tar.gz files for purging
                if purge_cutoff:
                    for f in os.listdir(m_path):
                        if f.endswith('.tar.gz'):
                            d_str = f[:-7]
                            try:
                                dir_date = datetime.strptime(f"{y}-{m}-{d_str}", '%Y-%m-%d')
                                if dir_date < purge_cutoff:
                                    print(f"  Purging expired tarball {archive_dir}/{y}/{m}/{f}")
                                    os.remove(os.path.join(m_path, f))
                            except ValueError:
                                pass

    # Step 3: Remove empty non-default archive directories
    for archive_dir in archive_dirs:
        if archive_dir in DEFAULT_ARCHIVE_DIRS:
            continue
        full_archive_dir = os.path.join(base_path, archive_dir)
        if os.path.exists(full_archive_dir) and os.path.isdir(full_archive_dir):
            remaining = [f for f in os.listdir(full_archive_dir) if not f.startswith('.')]
            if not remaining:
                print(f"  Removing empty archive directory {archive_dir}")
                try:
                    shutil.rmtree(full_archive_dir)
                except Exception as e:
                    print(f"  Error removing empty directory {archive_dir}: {e}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Consolidate and purge old artifact runs.")
    parser.add_argument("--purge-days", type=int, default=None, help="Purge artifacts older than N days")
    args = parser.parse_args()

    print(f"Consolidating artifacts older than {cutoff_date.isoformat()}...")
    if args.purge_days is not None:
        print(f"Purging artifacts older than {args.purge_days} days...")
    consolidate(purge_days=args.purge_days)
    print("Done.")
