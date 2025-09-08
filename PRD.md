# **Product Requirements Document: Timbergem**

**Version:** 1.0
**Date:** September 8, 2025
**Author:**
**Status:** DRAFT

## **1. Introduction & Vision**

### **1.1. The Problem**

The process of performing a construction takeoff and estimation is a high-skill, labor-intensive bottleneck in the Architecture, Engineering, and Construction (AEC) industry. An estimator must manually deconstruct hundreds of pages of complex, semi-structured documents, building a mental model of the project by cross-referencing plans, sections, schedules, and notes. This process is slow, prone to costly human error, and requires immense cognitive load. Existing software solutions are often rigid, failing to capture the fluid, interconnected nature of the source documents.

### **1.2. The Vision**

**Timbergem** is an intelligent copilot designed to augment the expertise of General Contractors and Estimators. It transforms static, inert construction documents into a dynamic, queryable, and fully interconnected **digital twin** of the project's knowledge.

By combining a flexible, manual-first user interface with powerful, targeted AI automation, Timbergem will drastically reduce the time spent on document analysis, improve the accuracy of takeoffs, and provide a single source of truth for the entire project scope. It is not a replacement for the expert, but a force multiplier for their intelligence.

### **1.3. Target Audience**

The primary user is the **General Contractor (GC) or professional Estimator** working on residential and light commercial construction projects. They are domain experts in construction but may have varying levels of technical proficiency. They value tools that are powerful, intuitive, and adapt to their workflow, not the other way around.

## **2. Guiding Principles**

These principles, born from previous iterations, will guide all design and development decisions to avoid past pitfalls.

  * **Manual-First, Automation-Second:** The application must first be a best-in-class tool for a human to *manually* construct the entire knowledge graph. The UX for manual creation, editing, and linking must be flawless. AI features will be layered on top of this robust foundation to accelerate, not dictate, the workflow.
  * **The Ground Anchor Principle:** Every entity that has a visual representation on the document **must** be anchored to a specific `source_sheet_number` and `bounding_box`. All conceptual entities (e.g., `Scope`, `Space`) must be defined solely by their relationships to these anchored entities. This ensures 100% traceability and verifiability.
  * **Flexibility Over Rigidity:** Real-world documents are messy and inconsistent. The data model and UI must be designed to handle "exotic" layouts, extraneous information, and variations in standards as the default case, not the exception.
  * **Traceability and Verifiability:** The user must always be able to understand *why* the system knows something. Every piece of information in the knowledge graph, and every relationship, must be easily traceable back to its source on the document canvas.

## **3. Core Features & User Stories**

### **3.1. Project Setup & Document Ingestion**

The user's journey begins with bringing their documents into the system.

  * **User Story:** As a GC, I want to upload a multi-page PDF construction document, so that Timbergem can process it and prepare it for analysis.
  * **Acceptance Criteria:**
      * User can upload a PDF file via a simple drag-and-drop interface.
      * The system processes the PDF in the background, providing status updates (`Processing...`, `Complete`).
      * Backend processing includes:
          * Rendering each page into a high-resolution PNG.
          * Performing layout-aware OCR to generate structured text and coordinate data for each page.
          * Storing all assets in a project-specific directory.

### **3.2. The Workspace: The Interactive Knowledge Canvas**

This is the user's primary interface for interacting with the document.

  * **User Story:** As an Estimator, I want a fluid, three-pane workspace that allows me to easily navigate between sheets, view the drawings, and manage the knowledge graph entities for the current page.
  * **Acceptance Criteria:**
      * **Left Pane (Project Navigator):** A collapsible list of all sheets in the document, identified by their sheet number (e.g., `a2.10`, `s1.00`). Clicking a sheet loads it in the center pane.
      * **Center Pane (The Canvas):** Displays the high-resolution image of the selected sheet. The user can pan and zoom smoothly. All user-created annotations (bounding boxes) are rendered on this canvas.
      * **Right Pane (The Knowledge Panel):** A dynamic, collapsible panel that displays all knowledge graph entities associated with the currently viewed sheet. This is the primary interface for all CRUD (Create, Read, Update, Delete) operations on the knowledge graph.

### **3.3. Knowledge Graph Construction (Manual-First)**

This is the core workflow of the application. The Knowledge Panel will have sections for each entity type.

#### **3.3.1. Foundational Entities (The "Ground Anchors")**

These entities represent the primary visual blocks on a sheet.

  * **User Story:** As a user, I want to identify and label the primary regions on a sheet, such as drawings, legends, schedules, and note blocks, so I can structure the page for further analysis.
  * **Workflow:**
    1.  In the appropriate section of the Knowledge Panel (e.g., "Drawings"), the user clicks `+ Add New`.
    2.  The cursor changes, and the user draws a bounding box on the Canvas over the desired area.
    3.  A form appears in the Knowledge Panel. The user fills in the required properties (e.g., for a `Drawing`: `Title`, `Type`, `Scale`).
    4.  Upon saving, a new entity "card" appears in the panel, and its bounding box is rendered on the canvas.
  * **Entities Covered:** `Drawing`, `Legend`, `Schedule`, `Note`.

#### **3.3.2. Definition Entities**

These entities are defined *within* foundational entities.

  * **User Story:** As a user, I want to define the meaning of symbols and components by referencing their definitions within legends and schedules, so I can link instances on drawings back to their specifications.
  * **Workflow (`SymbolDefinition`):**
    1.  The user clicks on a previously created `Legend` entity in the panel. The card expands.
    2.  The user clicks `+ Add Definition` *inside the Legend card*.
    3.  A form appears, including the critical **Scope** selector: `( ) Project-Wide` or `( ) This Sheet Only`.
    4.  The user fills in the `Name`, `Description`, and `Visual Pattern Description`.
    5.  The user clicks `Select on Drawing` and draws a tight bounding box around the specific symbol *within the legend's boundaries*.
    6.  A new `SymbolDefinition` card is created, nested under its parent `Legend`.
  * **Entities Covered:** `SymbolDefinition`, `ComponentDefinition` (similar workflow, but initiated from a `Schedule` entity).

#### **3.3.3. Instance Entities**

These entities represent the placement of defined objects onto drawings.

  * **User Story:** As a user, I want to quickly place instances of defined symbols and components onto my drawings, so I can build out the detailed plan.
  * **Workflow:**
    1.  In a top-level "Instances" section, the user clicks `+ Add New`.
    2.  A palette/menu appears, showing all created `SymbolDefinition` and `ComponentDefinition` entities.
    3.  The user selects a definition (e.g., "W6a Wall Assembly"). The cursor becomes a "stamp."
    4.  The user clicks on the Canvas within a `Drawing` area to place an instance. Each click creates a new `SymbolInstance` or `ComponentInstance`.
  * **Entities Covered:** `SymbolInstance`, `ComponentInstance`.

#### **3.3.4. Conceptual Entities & Linking**

These entities are abstract and are defined by their relationships.

  * **User Story:** As a user, I want to define conceptual things like physical spaces and scopes of work, and then link them to the visual evidence on the drawings to build a complete understanding of the project.
  * **Workflow (`Space`):**
    1.  In the "Spaces" section, user clicks `+ Add New`.
    2.  A form appears to enter the `Name` (e.g., "Kitchen"). A `Space` node is created.
  * **Workflow (Universal Linking Mode):**
    1.  The user creates a `Scope` entity ("Install Kitchen Cabinets").
    2.  On the new `Scope` card, the user clicks a "Link" icon. The application enters "Linking Mode."
    3.  The user can now click on any other entity card in the panel OR any annotation on the canvas (e.g., the `Space` named "Kitchen", the `Drawing` of the floor plan, multiple `SymbolInstance`s for cabinets).
    4.  Each clicked item appears as a "pill" in an "Evidence" section on the `Scope` card.
    5.  The user clicks "Finish Linking" to commit the relationships to the knowledge graph.

### **3.4. AI CoPilot Features (Automation Layer)**

These features will be built on top of the manual workflows.

  * **User Story:** As a user, I want to be able to click a button to have the AI automatically detect entities on the page, so I can accelerate my workflow.
  * **Acceptance Criteria:**
      * Each section in the Knowledge Panel (`Notes`, `Symbols`, etc.) has an `[AI] Detect` button.
      * Clicking this button triggers a backend process to find and create entities of that type for the current sheet.
      * All AI-created entities are initially flagged as "Unverified." The user can review, edit, or delete them.
      * A specific AI workflow for "Keynote Legends" will parse the legend and auto-create the corresponding sheet-scoped `SymbolDefinition` nodes.

## **4. The Data Model (The Schema)**

The entire system will be built around the following Pydantic data models, which serve as the single source of truth for our knowledge graph structure.

### **4.1. Node Models**

```python
# --- Base Models ---
class BoundingBox(BaseModel):
    x1: float; y1: float; x2: float; y2: float

class DocumentEntity(BaseModel):
    id: str = Field(default_factory=lambda: f"ent_{uuid.uuid4().hex[:10]}")
    source_sheet_number: str
    bounding_box: BoundingBox

# --- Foundational Document Structure Nodes ---
class Sheet(BaseModel):
    sheet_number: str; title: str; high_res_image_path: str; raw_text_path: str

class Drawing(DocumentEntity):
    drawing_type: str; scale: Optional[str] = None; title: Optional[str] = None

class Legend(DocumentEntity):
    legend_type: str; is_extraneous: bool = False

class Schedule(DocumentEntity):
    title: str; data_as_json: str; visual_legend_bbox: Optional = None

class Note(DocumentEntity):
    text_content: str; note_type: str

# --- Symbol and Component Models ---
class SymbolDefinition(DocumentEntity):
    name: str; description: str; scope: str; visual_pattern_description: str

class SymbolInstance(DocumentEntity):
    recognized_text: Optional[str] = None

class ComponentDefinition(DocumentEntity):
    component_type: str; identifier: str; specifications: Dict[str, Any]

class ComponentInstance(DocumentEntity):
    pass

# --- Conceptual Models (No Ground Anchor) ---
class Space(BaseModel):
    id: str = Field(default_factory=lambda: f"space_{uuid.uuid4().hex[:10]}")
    name: str

class Material(BaseModel):
    id: str = Field(default_factory=lambda: f"mat_{uuid.uuid4().hex[:10]}")
    name: str

class Assembly(BaseModel):
    id: str = Field(default_factory=lambda: f"asm_{uuid.uuid4().hex[:10]}")
    name: str; description: str

class Scope(BaseModel):
    id: str = Field(default_factory=lambda: f"scope_{uuid.uuid4().hex[:10]}")
    description: str; category: str
```

### **4.2. Relationship Schema**

| Type | Source Node(s) | Target Node(s) | Description |
|---|---|---|---|
| `CONTAINS` | `Sheet` | `Drawing`, `Legend`, `Schedule`, `Note` | A sheet physically contains these anchored elements. |
| `DEFINED_IN` | `SymbolDefinition`, `ComponentDefinition` | `Legend`, `Schedule` | An entity's master definition is located within a specific legend or schedule. |
| `DEPICTS` | `Drawing` | `Space` | A drawing provides a visual representation of a conceptual space. |
| `INSTANTIATED_AT` | `SymbolInstance`, `ComponentInstance` | `Drawing` | An instance of a symbol or component is located on a specific drawing. |
| `REFERENCES` | `SymbolInstance` | `SymbolDefinition` | A symbol on a drawing refers to its master definition. |
| `REPRESENTS` | `SymbolInstance` | `ComponentInstance` | A symbol (e.g., a hexagon with "W1") represents a component instance. |
| `IS_INSTANCE_OF` | `ComponentInstance` | `ComponentDefinition` | A component instance is an instance of a master definition from a schedule. |
| `LOCATED_IN` | `SymbolInstance`, `ComponentInstance` | `Space` | An instance is physically located within a conceptual space. |
| `COMPOSED_OF` | `Assembly` | `Material` | An assembly is made up of specific materials. |
| `SPECIFIES` | `SymbolDefinition`, `Note` | `Assembly`, `Material` | A symbol or note specifies that a particular assembly or material should be used. |
| `JUSTIFIED_BY` | `Scope` | `Note`, `SymbolInstance`, `ComponentInstance` | A scope of work is justified by evidence found on the drawings. |

## **5. Non-Functional Requirements**

  * **Performance:** Canvas panning and zooming must be smooth and responsive, even on large, high-resolution sheet images. API responses for loading entities on a page should be \<500ms.
  * **Scalability:** The system must be able to handle projects ranging from a 20-page residential plan to a 300-page commercial document set.
  * **Data Integrity:** All operations on the knowledge graph must be atomic to prevent inconsistent states. The relationship between entities must be strictly maintained.
  * **Extensibility:** The backend and data model must be designed to allow for the addition of new entity and relationship types in the future with minimal refactoring.

## **6. Future Vision & Roadmap**

The successful implementation of the features described in this document represents Version 1.0. The following are potential future enhancements:

  * **V2.0: Advanced Takeoff & Reporting:** Generate structured takeoff reports (e.g., CSV, Excel) directly from the knowledge graph (e.g., "List all instances of W1 windows and their locations").
  * **V2.1: Cost Estimation Integration:** Allow users to associate unit costs with `Material`, `Assembly`, and `Scope` nodes to generate preliminary cost estimates.
  * **V3.0: Fully Agentic CoPilot:** Introduce an advanced LLM agent that can autonomously query the knowledge graph to answer complex natural language questions ("What are all the materials needed for the second-floor framing?").
  * **V4.0: 3D Model Generation:** Explore the possibility of using the structured 2D data from the knowledge graph to generate a preliminary 3D model of the project, addressing the "bridge too far" concept as a long-term goal.