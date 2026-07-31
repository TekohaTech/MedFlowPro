#!/usr/bin/env python3
"""One-off cleanup: remove seeded mock activities from production (MedFlow Pro).

Seed fingerprint (from removed frontend/hooks/useAppState.ts + useTransactions.ts):
  8 activities with exact (institution, date, amount) combos.
Usage:
  python3 scripts/cleanup_seed_activities.py --dry-run
  python3 scripts/cleanup_seed_activities.py --delete
"""
import argparse
import sys
from pathlib import Path
from pymongo import MongoClient

ROOT = Path(__file__).resolve().parents[1]

def load_uri():
    for line in (ROOT / ".env").read_text().splitlines():
        if line.startswith("MONGO_URI="):
            return line.split("=", 1)[1].strip()
    raise SystemExit("MONGO_URI not found in .env")

# Exact fingerprint of the 8 seeded activities
SEED_PATTERN = [
    {"institution": "Hospital Italiano", "date": "2026-05-01", "amount": 25000},
    {"institution": "Sanatorio Güemes", "date": "2026-05-03", "amount": 20000},
    {"institution": "Clínica Olivos", "date": "2026-05-05", "amount": 15000},
    {"institution": "H. Británico", "date": "2026-05-07", "amount": 18000},
    {"institution": "Hospital Italiano", "date": "2026-04-28", "amount": 25000},
    {"institution": "Clínica Olivos", "date": "2026-04-25", "amount": 22000},
    {"institution": "Sanatorio Güemes", "date": "2026-04-22", "amount": 12000},
    {"institution": "H. Británico", "date": "2026-04-15", "amount": 20000},
]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--delete", action="store_true")
    args = ap.parse_args()
    if not args.dry_run and not args.delete:
        raise SystemExit("Specify --dry-run or --delete")

    client = MongoClient(load_uri(), serverSelectionTimeoutMS=15000)
    db = client["medflow"]
    col = db["actividades"]
    users = {str(u["_id"]): u.get("email", "?") for u in db["users"].find({}, {"email": 1})}

    total = 0
    affected = {}
    for pat in SEED_PATTERN:
        docs = list(col.find(pat))
        for d in docs:
            total += 1
            uid = d.get("userId", "?")
            affected.setdefault(uid, 0)
            affected[uid] += 1
            print(f"  [{pat['date']}] {pat['institution']} ${pat['amount']} -> user {users.get(uid, uid)}")

    print(f"\nTotal seeded activities found: {total}")
    print("Affected users:")
    for uid, n in affected.items():
        print(f"  {users.get(uid, uid)}: {n} activities")

    if args.delete:
        if total == 0:
            print("Nothing to delete.")
            return
        confirm = input(f"\nDelete {total} activities? Type 'DELETE' to confirm: ")
        if confirm.strip() != "DELETE":
            raise SystemExit("Aborted.")
        deleted = 0
        for pat in SEED_PATTERN:
            res = col.delete_many(pat)
            deleted += res.deleted_count
        print(f"Deleted {deleted} activities.")
    else:
        print("\nDry-run only — nothing deleted. Re-run with --delete to remove.")

if __name__ == "__main__":
    main()
