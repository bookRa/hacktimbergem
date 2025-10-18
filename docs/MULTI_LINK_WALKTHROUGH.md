# Multi-Link Walkthrough: Step-by-Step Guide

## 🎯 Scenario: Linking Multiple Evidence to a Conceptual Scope

Let's say you have a conceptual scope "Fire Exit Requirements" and you want to link multiple symbol instances and notes as evidence.

---

## 📋 Step-by-Step

### Step 1: Navigate to the Scope
```
1. Open Right Panel
2. Click "Explorer" tab
3. Click "Scopes" button
4. Find your conceptual scope (marked with 💭)
5. Click "Edit" button
```

**What you see:**
- Entity Editor opens in "Entities" tab
- Shows scope name and description
- "Evidence (0)" section at bottom

---

### Step 2: Start Multi-Link Mode
```
1. Scroll to "Evidence" section in Entity Editor
2. Click "🔗 Link Multiple" button (top right of Evidence section)
```

**What happens:**
- ChipsTray appears at top of canvas
- Shows "Linking mode" indicator
- Shows your scope as the source
- Toast notification: "Click symbols, components, or notes on canvas or in Explorer to link them as evidence. Click Finish when done."

**Visual:**
```
┌────────────────────────────────────────────┐
│  🔗 Linking mode                           │
│  Scope: Fire Exit Requirements             │
│  ────────────────                          │
│  [Cancel] [Finish (0)]                     │
└────────────────────────────────────────────┘
```

---

### Step 3: Select Entities from Explorer
```
1. Click "Symbols ▸ Instances" tab in Explorer
2. Click on symbol instances you want to link
   - Click once to add
   - Click again to remove
3. Switch to "Notes" tab
4. Click notes you want to link
```

**What you see:**
- Clicked items get blue border
- Checkmark (✓) appears next to ID
- Background turns light blue (#eff6ff)
- Count in ChipsTray increases: "Finish (3)"

**Visual:**
```
Symbol Instances:
┌─────────────────────────────┐
│ [1] Exit Sign A          │ ← Normal
├─────────────────────────────┤
│ [2] Exit Sign B      ✓   │ ← Selected (blue border)
├─────────────────────────────┤
│ [3] Exit Sign C          │
└─────────────────────────────┘

ChipsTray updates:
┌────────────────────────────────────────────┐
│  🔗 Linking mode                           │
│  Scope: Fire Exit Requirements             │
│  Exit Sign B (SymbolInst)                  │
│  ────────────────                          │
│  [Cancel] [Finish (1)]                     │
└────────────────────────────────────────────┘
```

---

### Step 4: Select Entities from Canvas (Optional)
```
1. Navigate to different sheets if needed
2. Click entities on the canvas
   - They get added to pending list
   - Highlighted with selection border
```

**What you see:**
- Canvas entities highlight when selected
- They appear in ChipsTray
- Count continues increasing

---

### Step 5: Review Selection
```
1. Look at ChipsTray
2. Each selected entity shown with:
   - ID prefix
   - Entity type (SymbolInst, CompInst, Note)
   - [X] button to remove
```

**Visual:**
```
┌────────────────────────────────────────────┐
│  🔗 Linking mode                           │
│  Scope: Fire Exit Requirements             │
│  ────────────────                          │
│  Exit Sign B (SymbolInst)           [×]    │
│  Exit Sign C (SymbolInst)           [×]    │
│  Note #abc123 (Note)                [×]    │
│  ────────────────                          │
│  [Cancel] [Finish (3)]                     │
└────────────────────────────────────────────┘
```

---

### Step 6: Finish Linking
```
1. Click "Finish (3)" button in ChipsTray
```

**What happens:**
- Links created via batch API call
- Success toast: "3 links created"
- ChipsTray closes
- Entity Editor Evidence section refreshes
- Selected entities now appear in Evidence list

**Visual:**
```
Evidence Section (After):
┌─────────────────────────────────────────────┐
│ Evidence (3)          [🔗 Link Multiple]    │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │ Symbol                                │ │
│  │ #def456 • Sheet 2                     │ │
│  │ "Exit Sign B"                         │ │
│  │                       [Edit]    [×]   │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │ Symbol                                │ │
│  │ #ghi789 • Sheet 2                     │ │
│  │ "Exit Sign C"                         │ │
│  │                       [Edit]    [×]   │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │ Note                                  │ │
│  │ #abc123 • Sheet 1                     │ │
│  │ "Must have emergency lighting..."     │ │
│  │                       [Edit]    [×]   │ │
│  └───────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

---

## 🔄 Alternative: Cancel

At any point during Steps 3-5, you can:
```
1. Click "Cancel" in ChipsTray
```

**What happens:**
- Linking mode exits
- No links created
- Entity Editor stays open
- No changes made

---

## ⚡ Quick Tips

### 1. **Pre-Selected Evidence**
When you start multi-link mode, existing evidence is pre-populated in the pending list. You can:
- Remove them by clicking again
- Keep them selected (no duplicate links created)

### 2. **Mix Entity Types**
You can link:
- Symbol instances + Component instances
- Symbol instances + Notes
- All three types together

### 3. **Cross-Sheet Linking**
You can link entities from different sheets:
1. Start linking mode
2. Navigate to Sheet 1, click entities
3. Navigate to Sheet 2, click entities
4. Navigate to Sheet 3, click entities
5. Click Finish

All links created at once!

### 4. **Visual State Indicators**

| State | Border | Background | Indicator |
|-------|--------|------------|-----------|
| Normal | 1px #e1e6eb | #fff | None |
| Hovered | 1px #e1e6eb | #f9fafb | None |
| Selected | 2px #2563eb | #eff6ff | ✓ |

### 5. **Keyboard Workflow**
```
Tab         → Navigate between entity cards
Enter       → Select/deselect entity (when focused)
Esc         → Cancel linking mode
```
*(Keyboard support may vary - mouse is primary input)*

---

## 🐛 Troubleshooting

### "All selected entities are already linked"
**Cause:** You selected only entities that are already linked to this scope.

**Solution:** 
1. Select at least one new entity (not already linked)
2. Or cancel and add evidence individually

### ChipsTray doesn't appear
**Cause:** Linking mode didn't start properly.

**Solution:**
1. Close Entity Editor
2. Reopen and try again
3. Check browser console for errors

### Can't click entities in Explorer
**Cause:** Not in linking mode.

**Solution:**
1. Make sure ChipsTray is visible at top
2. If not, click "🔗 Link Multiple" again

### Finish button is disabled
**Cause:** No entities selected (count is 0).

**Solution:**
1. Click at least one entity to add to pending
2. Button enables when count > 0

---

## 🎬 Demo Recording Guide

To record a GIF/video demo:

1. **Setup** (before recording):
   - Create a conceptual scope "Fire Safety Compliance"
   - Have 3-4 symbol instances on different sheets
   - Have 1-2 notes with relevant text

2. **Recording**:
   - Start at Explorer > Scopes
   - Show selecting the scope
   - Click Edit
   - Click "🔗 Link Multiple"
   - Show ChipsTray appearing
   - Click 2 symbol instances (show blue borders)
   - Click 1 note (show checkmark)
   - Show ChipsTray count: "Finish (3)"
   - Click Finish
   - Show success toast
   - Show Evidence section with 3 items

3. **Timing**:
   - Total: ~30 seconds
   - Use 1.5x speed if needed
   - Add text annotations for clarity

---

**Happy Linking! 🎉**

