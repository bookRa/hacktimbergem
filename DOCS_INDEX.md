# TimberGem Documentation Index

**Last Updated:** November 13, 2025

This file provides an overview of all active documentation in the TimberGem project.

---

## 📘 Core Architecture & Design

### **ARCHITECTURE.md** 🌟 **START HERE**
The definitive guide to TimberGem's Clean Architecture implementation.

**Contents:**
- Complete system architecture overview
- Layer-by-layer breakdown (Domain, Application, Infrastructure, Presentation)
- Data flow diagrams
- Coordinate system explanation
- Testing strategy
- AI integration points
- Common patterns and recipes

**When to read:** 
- Onboarding new developers
- Before adding new features
- When understanding data flow
- Before implementing AI features

---

### **PRD.md** 📋
Product Requirements Document outlining the vision and core features.

**Contents:**
- Problem statement and vision
- Guiding principles (Manual-First, Ground Anchor Principle)
- User stories for all entity types
- Complete data model (Pydantic schemas)
- Relationship schema
- Future roadmap

**When to read:**
- Understanding product vision
- Defining new entity types
- Validating feature alignment with principles

---

### **AGENTS.md** 🤖
Guidelines for AI agents (Claude, Cursor) working on the codebase.

**Contents:**
- Mission and guardrails
- Component structure
- Entity model additions
- Approved UI primitives
- Workflow patterns (drag→create, linking, OCR)
- PR checklist

**When to read:**
- Before agent-assisted development
- Understanding canvas-first UX patterns
- Verifying component changes

---

### **cursor_rules.md**
Internal rules for Cursor IDE agent interactions.

**Contains:** Coordinate system invariants, testing policy, extensibility guidelines.

---

## 📱 UI/UX Documentation

### **PRD_UI_UX.md**
Detailed UI/UX requirements and interaction patterns.

**Contents:**
- Three-pane workspace design
- Canvas interaction patterns
- Knowledge panel structure
- Linking mode UX
- Visual design principles

---

### **TODO.md** ✅
Current sprint status and task tracking for UI V2 development.

**Contents:**
- Sprint A-E breakdown (Scaffold → Linking → Explorer → Polish)
- Completed features (✅)
- In-progress features
- Backlog items

**When to read:** 
- Daily standup
- Sprint planning
- Understanding current state

---

## 📖 Feature Guides

### **docs/INTERACTION_SPEC.md**
Detailed specification for canvas interaction patterns.

**Contents:**
- Mouse/keyboard event handling
- Entity creation flows
- Selection and editing modes

---

### **docs/MULTI_LINK_SCOPES.md**
Multi-entity linking system documentation.

**Contents:**
- Link relationship types
- Scope-based evidence collection
- Linking mode state machine

---

### **docs/MULTI_LINK_WALKTHROUGH.md**
Step-by-step walkthrough of the linking feature.

**Contents:**
- User journey for creating links
- Screenshots and examples
- Edge cases and validation

---

### **docs/STAMPING_QUICK_GUIDE.md**
Quick reference for stamping (placing instances) workflow.

**Contents:**
- Symbol instance placement
- Component instance placement
- Palette/selection UI

---

### **docs/PRD_v2.md**
UI V2 specific product requirements (subset of main PRD).

---

## 🗂️ Archive

Old documentation retained for historical reference:

### **docs/archive/bugfixes/**
- `ENTITY_CREATION_FIXES.md`
- `DRAWING_MODE_INDICATOR.md`
- `SHEET_TITLES_PERSISTENCE_FIX.md`

### **docs/archive/features/**
Implementation summaries for completed features (scope refactor, stamping, duplication detection, OCR integration).

### **docs/archive/scope_refactor/**
Multi-phase scope refactoring documentation (completed).

---

## 🧭 Navigation Guide

### I want to...

**Understand the overall system**  
→ Start with `ARCHITECTURE.md`

**Add a new entity type**  
→ Read `PRD.md` (data model) → `ARCHITECTURE.md` (Pattern 1: Adding a New Entity Type)

**Implement an AI feature**  
→ Read `ARCHITECTURE.md` (AI Integration Points) → Implement service interface → Create use case

**Fix a coordinate bug**  
→ Read `ARCHITECTURE.md` (Coordinate System) → Check `backend/app/coords.py` and `frontend/src/utils/coords.ts`

**Understand current UI development**  
→ Read `TODO.md` → `AGENTS.md` for guardrails

**Add a new relationship type**  
→ Read `PRD.md` (Relationship Schema) → `docs/MULTI_LINK_SCOPES.md`

**Migrate from file storage to Neo4j**  
→ Read `ARCHITECTURE.md` (Migration Paths)

**Write tests**  
→ Read `ARCHITECTURE.md` (Testing Strategy)

**Onboard a new developer**  
1. `PRD.md` - Understand the vision
2. `ARCHITECTURE.md` - Learn the architecture
3. `TODO.md` - See current state
4. Run `python backend/test_api.py` - Verify setup

---

## 📦 Code Structure Reference

### Backend (`backend/app/`)
```
main.py                 # FastAPI entry point
config.py               # Settings
coords.py               # Coordinate transforms
ingest.py               # PDF processing

domain/
  models/               # Pydantic models
  services/             # Domain logic (validators, spatial analysis)

use_cases/              # Business logic (THE CORE)
  entities/
  concepts/
  links/

repositories/           # Data access interfaces
  implementations/      # File-based implementations

services/
  ai/                   # AI service interfaces
  storage/              # File I/O utilities

api/
  dependencies.py       # Dependency injection
  routes/               # FastAPI endpoints
```

### Frontend (`frontend/src/`)
```
pages/ProjectPage.tsx   # Main workspace

state/                  # Zustand stores
  ui_v2.ts              # Canvas interaction
  project.ts            # Data state

api/                    # Backend API clients

ui_v2/                  # UI V2 components
  canvas/
  menus/
  forms/
  overlays/
  linking/

utils/coords.ts         # Coordinate transforms
```

---

## 🔄 Maintenance

### When to update this index
- New top-level markdown files added
- Major documentation reorganization
- Archive decisions
- New major features documented

### Cleanup policy
- Implementation summaries → Delete after feature is stable for 1+ sprint
- Bugfix docs → Move to `archive/bugfixes/`
- Feature planning docs → Delete after implementation complete
- Keep: Architecture, PRD, active guides

---

## ❓ Questions?

**Can't find what you need?**
1. Check `ARCHITECTURE.md` first (most comprehensive)
2. Use `grep -r "keyword" .` to search all docs
3. Check git history: `git log --all --oneline -- <file>`

**Documentation outdated?**
1. Cross-reference with actual code
2. Update the doc or delete if no longer relevant
3. Update this index if structure changed

