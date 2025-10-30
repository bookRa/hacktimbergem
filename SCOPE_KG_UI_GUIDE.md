# Knowledge Graph-First UI: User Guide

## 🎯 Quick Start

The new Knowledge Graph-First UI makes scope management visual, intuitive, and fast. Here's how to use the new features.

---

## 📍 Feature 1: Creating a New Scope

### Old Workflow (Simple Form)
1. Click "+ New Scope" in right explorer
2. Type name and description manually
3. Save and then manually find/link entities later

### New Workflow (Knowledge Graph Composition)

#### Step 1: Browse the Knowledge Graph
1. Click "+ New Scope" → Select "Conceptual Scope"
2. **Knowledge Graph browser opens** showing all symbol instances by default
3. See rich entity cards with:
   - 🖼️ Visual thumbnail of the symbol
   - 🏷️ Entity type and sheet location
   - 🔗 Relationships (definition, legend item, etc.)
   - 📝 Recognized text and descriptions

#### Step 2: Select Relevant Entities
1. **Browse symbol instances or switch to Notes**
2. Use search to filter: "mechanical ventilation", "MH-1", etc.
3. **Click cards to multi-select** (checkmark appears)
4. Selected count shows at bottom: "3 selected"

#### Step 3: Compose Scope
1. Click **"Next: Compose →"**
2. Review selected entities in compact view
3. **Name and description auto-generated** from:
   - Symbol recognized text → scope name
   - Legend item description → scope description
   - Assembly details → "Install [code] - [name]"
   - Schedule item → "Install [mark]: [description]"
4. **Edit as needed** (fully editable)
5. Click **"Create Scope"**

**Result**: Scope created with meaningful defaults, ready to link evidence from scope editor

---

## 📎 Feature 2: Adding Evidence to a Scope

### Old Workflow
1. Open scope editor
2. Click "+ Add Evidence"
3. See minimal list: "a50d8703 | Sheet 4" (what is this?)
4. Guess based on IDs

### New Workflow (Rich Context)

1. Open scope editor
2. Click **"+ Add Evidence"** in Evidence Links section
3. **Entity cards appear** with full context:
   ```
   🔷 Symbol Instance                    Sheet 4
   ┌─────────────────────────────────────────┐
   │  [Thumbnail of bbox]  │  MH-1           │
   │                       │  defined by     │
   │                       │  🔷 Mech Symbol │
   │                       │  represents     │
   │                       │  📝 Legend Item │
   └─────────────────────────────────────────┘
   ```
4. **Multi-select** relevant evidence with visual feedback
5. Click **"Add Evidence"**
6. Evidence cards display in Evidence Links section with thumbnails

**Result**: You see exactly what you're linking, with full visual and semantic context

---

## 🔍 Feature 3: Understanding Entity Relationships

### What EntityCard Shows

Every entity card automatically discovers and displays:

#### For Symbol Instances
- **Definition**: Which symbol definition it's based on
- **Definition Item**: Associated legend/assembly/schedule item
- **Parent Container**: Legend, Assembly Group, or Schedule
- **Links**: JUSTIFIED_BY, LOCATED_IN relationships

#### For Definition Items (Legend/Assembly/Schedule)
- **Parent Container**: The legend/assembly group/schedule it belongs to
- **Linked Symbols**: How many instances reference it

#### For Notes
- **Links**: Any JUSTIFIED_BY relationships to other entities
- **Text Preview**: First few lines of note content

### Visual Indicators

```
🔷 Symbol Instance       = Blue icon, blue highlight
📝 Note                  = Green icon, green highlight  
📐 Drawing               = Purple icon, purple highlight
📝 Legend Item           = Orange icon, orange highlight
🔧 Assembly              = Red icon, red highlight
📊 Schedule Item         = Cyan icon, cyan highlight
⬡ Component Instance     = Pink icon, pink highlight
```

---

## 💡 Smart Auto-Generation

The system intelligently extracts scope details:

### From Symbol Instances
```
Symbol: "MH-1" on Sheet 4
  ↓
Definition Item: Legend Item
  Symbol Text: "MH-1"
  Description: "Whole house mechanical ventilation"
  ↓
Generated:
  Name: "MH-1"
  Description: "MH-1: Whole house mechanical ventilation"
```

### From Assemblies
```
Assembly: Code "04 22 00.13", Name "CMU Wall Assembly"
  ↓
Generated:
  Name: "04 22 00.13 - CMU Wall Assembly"
  Description: "Install 04 22 00.13 - CMU Wall Assembly"
```

### From Schedule Items
```
Schedule Item: Mark "W-101", Type "Fixed Window"
  ↓
Generated:
  Name: "W-101"
  Description: "Install W-101: Fixed Window"
```

---

## 🎨 Entity Card Modes

### Full Mode (Default in Evidence Picker)
- Large thumbnail (120px width)
- All relationships shown
- Full text descriptions
- Sheet location badge
- Type icon and label

### Compact Mode (Used in Scope Composer review)
- Small icon
- Single line text
- Sheet number only
- Checkmark when selected

---

## 🔎 Search and Filter

### Search Capabilities
The search box filters entities by:
- Recognized text (for symbol instances)
- Note text content
- Entity names and descriptions
- Definition item descriptions
- Assembly codes and names
- Schedule marks

### Entity Type Filters
Quick toggle buttons:
- **Symbol Instances** (most common for scopes)
- **Notes** (annotations and comments)
- **Component Instances** (for detailed components)

---

## 📐 Sheet Navigation

Every entity card with a canvas location shows:
- **Sheet badge**: "Sheet 4" in gray pill
- Click to jump to that sheet (future enhancement)
- Visual thumbnail shows exact location on sheet

---

## ⚡ Quick Tips

### Creating Scopes Faster
1. **Start with symbol instances** (default in browse mode)
2. **Search for symbol text** ("MH-", "W-", etc.)
3. **Multi-select all related** symbols at once
4. Auto-generation handles the rest

### Understanding Entity Context
1. **Hover over relationships** to see full entity info
2. **Look at thumbnail** for spatial context
3. **Check parent container** to understand hierarchy
4. **Sheet badge** tells you where to find it

### Linking Evidence Efficiently
1. **Switch to symbol instances tab** first
2. **Use search** to narrow down quickly
3. **Select multiple at once** (faster than one-by-one)
4. **Review cards before adding** to ensure correctness

---

## 🎯 Common Workflows

### Workflow 1: Create scope for all instances of a symbol
1. New Scope → Browse symbol instances
2. Search for symbol text (e.g., "A-1")
3. Select all instances across sheets
4. Compose → Auto-generated description from legend
5. Create scope

### Workflow 2: Add notes as evidence
1. Open scope editor
2. Add Evidence → Switch to Notes tab
3. Find relevant note by sheet or search
4. Select note (see full text in card)
5. Add evidence

### Workflow 3: Link assembly to scope
1. Open scope editor
2. Add Evidence → Switch to Symbol Instances
3. Search for assembly code or name
4. Select symbol instances representing assembly
5. Add evidence → Assembly info shown in related entities panel

---

## 🐛 Troubleshooting

### "No thumbnail displayed"
- Entity might not have a bbox (conceptual entities)
- Page image might still be loading
- Check browser console for errors

### "Relationships not showing"
- Entity might not be linked to anything yet
- Parent containers only show for items (not groups)
- Links are created through linking mode or API

### "Auto-generation not working"
- Symbol instance needs definition item linked
- Definition item needs parent container (legend/assembly/schedule)
- Check relationships in entity card

### "Search not finding entity"
- Try partial text (search is substring match)
- Check entity type filter (might be filtering it out)
- Entity might not have searchable text

---

## 🚀 Power User Tips

### Keyboard Shortcuts (Future)
- `Esc` to close modals
- `Enter` to confirm selection
- `Arrow keys` to navigate cards

### Multi-Select Patterns
1. Select all on one sheet → Create location-specific scope
2. Select same symbol across sheets → Create symbol-wide scope
3. Select related assemblies → Create assembly installation scope

### Description Editing
- Auto-generated descriptions are starting points
- Add project-specific details manually
- Copy from related entities as needed

---

## 📊 Visual Hierarchy

```
Modal/Page Level
└─ Section Headers
   └─ Entity Cards (Full Mode)
      ├─ Type Label + Icon
      ├─ Sheet Badge
      ├─ Thumbnail (if has bbox)
      ├─ Display Text
      └─ Relationships
         ├─ Parent Container
         ├─ Definition
         └─ Links

Compact Cards (Review Mode)
└─ Icon + Text + Sheet Number
```

---

## 🎉 Benefits Summary

| Aspect | Before | After |
|--------|--------|-------|
| Entity IDs | `a50d8703` | "MH-1: Whole house mechanical ventilation" |
| Visual Context | None | Thumbnail screenshots |
| Relationships | Hidden | Displayed in cards |
| Scope Creation | Manual form | Knowledge Graph composition |
| Evidence Selection | ID guessing | Full context cards |
| Search | Limited | Across all metadata |
| Multi-select | One by one | Batch selection |
| Auto-generation | None | From entity relationships |

---

**Need Help?**  
Refer to `SCOPE_EDITOR_KG_OVERHAUL.md` for technical details and architecture.


