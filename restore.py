#!/usr/bin/env python3
"""
Firebase Restore Script
Restores Firestore data and code files from a backup directory.
"""

import os
import json
import shutil
import sys
from pathlib import Path
import firebase_admin
from firebase_admin import credentials, firestore

def restore_firestore_data(db, backup_dir):
    """Restore Firestore collections from JSON files"""
    print("Restoring Firestore data...")
    
    # Get backup info
    backup_info_path = backup_dir / "backup_info.json"
    if backup_info_path.exists():
        with open(backup_info_path, 'r') as f:
            backup_info = json.load(f)
        collections = backup_info.get("collections", [])
    else:
        # Fallback: look for JSON files
        collections = [f.stem for f in backup_dir.glob("*.json") if f.name != "backup_info.json"]
    
    for collection_name in collections:
        json_file = backup_dir / f"{collection_name}.json"
        if not json_file.exists():
            print(f"  Warning: {json_file} not found, skipping")
            continue
            
        print(f"  Restoring collection: {collection_name}")
        
        with open(json_file, 'r') as f:
            collection_data = json.load(f)
        
        collection_ref = db.collection(collection_name)
        
        # Clear existing data (optional - comment out if you want to merge)
        docs = collection_ref.stream()
        for doc in docs:
            doc.reference.delete()
        
        # Restore documents
        for doc_id, doc_data in collection_data.items():
            collection_ref.document(doc_id).set(doc_data)
    
    print("Firestore restore completed")

def restore_code_files(backup_dir):
    """Restore code files from backup"""
    print("Restoring code files...")
    
    code_dir = backup_dir / "code"
    if not code_dir.exists():
        print("No code backup found")
        return
    
    # Get current directory
    current_dir = Path.cwd()
    
    # Restore files
    restored_count = 0
    for file_path in code_dir.rglob("*"):
        if file_path.is_file():
            # Calculate relative path from code directory
            relative_path = file_path.relative_to(code_dir)
            dest_path = current_dir / relative_path
            
            # Create parent directories if needed
            dest_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Copy file
            shutil.copy2(file_path, dest_path)
            restored_count += 1
    
    print(f"Restored {restored_count} code files")

def list_backups():
    """List available backup directories"""
    backup_dirs = [d for d in Path.cwd().iterdir() if d.is_dir() and d.name.startswith("backup_")]
    
    if not backup_dirs:
        print("No backup directories found")
        return []
    
    print("Available backups:")
    for i, backup_dir in enumerate(sorted(backup_dirs), 1):
        backup_info_path = backup_dir / "backup_info.json"
        if backup_info_path.exists():
            with open(backup_info_path, 'r') as f:
                info = json.load(f)
            created_at = info.get("created_at", "Unknown")
            print(f"  {i}. {backup_dir.name} (Created: {created_at})")
        else:
            print(f"  {i}. {backup_dir.name}")
    
    return sorted(backup_dirs)

def main():
    if len(sys.argv) > 1:
        backup_dir = Path(sys.argv[1])
        if not backup_dir.exists():
            print(f"Error: Backup directory '{backup_dir}' not found")
            sys.exit(1)
    else:
        # Interactive selection
        backups = list_backups()
        if not backups:
            sys.exit(1)
        
        try:
            choice = int(input("\nSelect backup to restore (number): ")) - 1
            if 0 <= choice < len(backups):
                backup_dir = backups[choice]
            else:
                print("Invalid selection")
                sys.exit(1)
        except (ValueError, KeyboardInterrupt):
            print("\nOperation cancelled")
            sys.exit(1)
    
    print(f"Restoring from: {backup_dir}")
    
    # Confirm restoration
    confirm = input("This will overwrite existing data. Continue? (y/N): ")
    if confirm.lower() != 'y':
        print("Restoration cancelled")
        sys.exit(1)
    
    # Initialize Firebase Admin SDK
    try:
        cred = credentials.Certificate("firebase-private-key.json")
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        
        # Restore Firestore data
        restore_firestore_data(db, backup_dir)
        
    except Exception as e:
        print(f"Error restoring Firestore data: {e}")
    
    # Restore code files
    restore_code_files(backup_dir)
    
    print("Restore completed successfully")

if __name__ == "__main__":
    main()
