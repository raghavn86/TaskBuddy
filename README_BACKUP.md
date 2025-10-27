# Firebase Backup & Restore Scripts

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Place your Firebase private key JSON file as `firebase-private-key.json` in the same directory as the scripts.

## Backup

Run the backup script:
```bash
python backup.py
```

This will create a timestamped directory (e.g., `backup_20241209_050528`) containing:
- `*.json` files with Firestore collection data
- `code/` directory with all git-tracked files
- `backup_info.json` with backup metadata

## Restore

### Interactive restore (recommended):
```bash
python restore.py
```
This will show available backups and let you choose which one to restore.

### Direct restore:
```bash
python restore.py backup_20241209_050528
```

## What gets backed up:

### Firestore Collections:
- users
- templates  
- executionPlans
- categories

### Code Files:
- All files tracked by git (uses `git ls-files`)
- Excludes node_modules, build artifacts, etc.

## Important Notes:

- **Restore overwrites existing data** - make sure you want to do this
- The restore script will ask for confirmation before proceeding
- Code files are restored to their original locations
- Firestore collections are completely replaced (existing documents are deleted first)

## File Structure:

```
backup_YYYYMMDD_HHMMSS/
├── backup_info.json      # Backup metadata
├── users.json           # Users collection
├── templates.json       # Templates collection  
├── executionPlans.json  # Execution plans collection
├── categories.json      # Categories collection
└── code/               # Git-tracked source files
    ├── src/
    ├── public/
    ├── package.json
    └── ...
```
