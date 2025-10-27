#!/usr/bin/env python3
"""
Firebase Backup Script
Backs up Firestore data and git-tracked code files to a timestamped directory.
"""

import os
import json
import shutil
import subprocess
from datetime import datetime
from pathlib import Path
import firebase_admin
from firebase_admin import credentials, firestore

def get_git_tracked_files():
    """Get list of files tracked by git"""
    try:
        result = subprocess.run(['git', 'ls-files'], capture_output=True, text=True, check=True)
        return result.stdout.strip().split('\n')
    except subprocess.CalledProcessError:
        print("Error: Not in a git repository or git command failed")
        return []

def backup_firestore_data(db, backup_dir):
    """Backup all Firestore collections to JSON files"""
    print("Backing up Firestore data...")
    
    # Get all collections
    collections = ['users', 'templates', 'executionPlans', 'categories']
    
    for collection_name in collections:
        print(f"  Backing up collection: {collection_name}")
        collection_ref = db.collection(collection_name)
        docs = collection_ref.stream()
        
        collection_data = {}
        for doc in docs:
            collection_data[doc.id] = doc.to_dict()
        
        # Save to JSON file
        with open(backup_dir / f"{collection_name}.json", 'w') as f:
            json.dump(collection_data, f, indent=2, default=str)
    
    print("Firestore backup completed")

def backup_code_files(backup_dir):
    """Backup git-tracked files"""
    print("Backing up code files...")
    
    git_files = get_git_tracked_files()
    if not git_files:
        print("No git-tracked files found")
        return
    
    code_dir = backup_dir / "code"
    code_dir.mkdir(exist_ok=True)
    
    for file_path in git_files:
        if os.path.exists(file_path):
            dest_path = code_dir / file_path
            dest_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(file_path, dest_path)
    
    print(f"Backed up {len(git_files)} code files")

def main():
    # Create timestamped backup directory
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_dir = Path(f"backup_{timestamp}")
    backup_dir.mkdir(exist_ok=True)
    
    print(f"Creating backup in: {backup_dir}")
    
    # Initialize Firebase Admin SDK
    try:
        cred = credentials.Certificate("firebase-private-key.json")
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        
        # Backup Firestore data
        backup_firestore_data(db, backup_dir)
        
    except Exception as e:
        print(f"Error backing up Firestore data: {e}")
    
    # Backup code files
    backup_code_files(backup_dir)
    
    # Create backup info file
    backup_info = {
        "timestamp": timestamp,
        "created_at": datetime.now().isoformat(),
        "backup_type": "full",
        "collections": ["users", "templates", "executionPlans", "categories"]
    }
    
    with open(backup_dir / "backup_info.json", 'w') as f:
        json.dump(backup_info, f, indent=2)
    
    print(f"Backup completed successfully in: {backup_dir}")

if __name__ == "__main__":
    main()
