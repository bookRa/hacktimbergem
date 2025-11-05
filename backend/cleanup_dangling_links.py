#!/usr/bin/env python3
"""
Cleanup script to remove dangling links from links.json.

This script:
1. Loads all entities and concepts for a project
2. Loads all links
3. Identifies links that reference non-existent entities/concepts
4. Removes dangling links and saves the cleaned links.json

Usage:
    python cleanup_dangling_links.py <project_id>
"""

import sys
import os

# Add app directory to path so we can import modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.entities_store import load_entities
from app.concepts_store import load_concepts
from app.links_store import load_links, save_links


def cleanup_dangling_links(project_id: str) -> dict:
    """
    Remove dangling links from links.json.
    
    Returns a dict with statistics about the cleanup.
    """
    print(f"[Cleanup] Loading entities for project {project_id}...")
    entities = load_entities(project_id)
    entity_ids = {getattr(e, 'id', None) for e in entities}
    print(f"[Cleanup] Found {len(entity_ids)} entities")
    
    print(f"[Cleanup] Loading concepts for project {project_id}...")
    concepts = load_concepts(project_id)
    concept_ids = {getattr(c, 'id', None) for c in concepts}
    print(f"[Cleanup] Found {len(concept_ids)} concepts")
    
    # Combine all valid IDs
    all_valid_ids = entity_ids | concept_ids
    print(f"[Cleanup] Total valid IDs: {len(all_valid_ids)}")
    
    print(f"[Cleanup] Loading links for project {project_id}...")
    links = load_links(project_id)
    original_count = len(links)
    print(f"[Cleanup] Found {original_count} links")
    
    # Identify dangling links
    dangling_links = []
    valid_links = []
    
    for link in links:
        source_id = getattr(link, 'source_id', None)
        target_id = getattr(link, 'target_id', None)
        link_id = getattr(link, 'id', None)
        rel_type = getattr(link, 'rel_type', None)
        
        source_missing = source_id not in all_valid_ids
        target_missing = target_id not in all_valid_ids
        
        if source_missing or target_missing:
            dangling_links.append({
                'link_id': link_id,
                'rel_type': rel_type,
                'source_id': source_id,
                'target_id': target_id,
                'source_missing': source_missing,
                'target_missing': target_missing,
            })
        else:
            valid_links.append(link)
    
    # Report findings
    print(f"\n{'='*60}")
    print(f"CLEANUP SUMMARY")
    print(f"{'='*60}")
    print(f"Total links: {original_count}")
    print(f"Valid links: {len(valid_links)}")
    print(f"Dangling links: {len(dangling_links)}")
    
    if dangling_links:
        print(f"\n{'='*60}")
        print(f"DANGLING LINKS DETAILS")
        print(f"{'='*60}")
        for i, dl in enumerate(dangling_links, 1):
            print(f"\n{i}. Link ID: {dl['link_id']}")
            print(f"   Type: {dl['rel_type']}")
            print(f"   Source: {dl['source_id']} {'(MISSING)' if dl['source_missing'] else '(exists)'}")
            print(f"   Target: {dl['target_id']} {'(MISSING)' if dl['target_missing'] else '(exists)'}")
        
        # Save cleaned links
        print(f"\n{'='*60}")
        print(f"Saving cleaned links.json...")
        save_links(project_id, valid_links)
        print(f"✅ Successfully removed {len(dangling_links)} dangling link(s)")
        print(f"{'='*60}\n")
    else:
        print(f"\n✅ No dangling links found. links.json is clean!")
        print(f"{'='*60}\n")
    
    return {
        'original_count': original_count,
        'valid_count': len(valid_links),
        'dangling_count': len(dangling_links),
        'dangling_links': dangling_links,
    }


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: python cleanup_dangling_links.py <project_id>")
        print("\nExample:")
        print("  python cleanup_dangling_links.py 0148e57bf39b4c2ca2cd0d629168a4a0")
        sys.exit(1)
    
    project_id = sys.argv[1]
    
    try:
        result = cleanup_dangling_links(project_id)
        
        if result['dangling_count'] > 0:
            print(f"🧹 Cleanup complete! Removed {result['dangling_count']} dangling link(s).")
        else:
            print(f"✨ No cleanup needed. All links are valid.")
        
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error during cleanup: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

