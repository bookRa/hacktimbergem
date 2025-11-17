# TimberGem AI Automation PRD – Multimodal Document Processing and Reasoning

**Version:** 1.0  
**Date:** 15 Nov 2025  
**Audience:** Internal product & engineering teams  
**Purpose:** Describe the requirements and logic flow for the next evolution of TimberGem’s automation. This document focuses on how to parse complex construction documents using vision and language models, when to create entities, and how to bridge human reasoning with AI reasoning. It supplements earlier architecture and strategy documents by explicitly treating the multi‑modal nature of drawings, tables and text.

## 1 Why multimodal parsing is essential

Construction plan sets combine dense paragraphs, schedules, legends, diagrams and floor plans on the same page. Traditional “top‑down” approaches that operate only on OCR text miss critical context; likewise “bottom‑up” detection on images without text misses semantics. Recent research in the built‑environment demonstrates that accurate model reconstruction requires harmonising drawings, text and tables through a unified parsing and integration pipeline[\[1\]](https://www.mdpi.com/2075-5309/15/22/4048). Multi‑modal extraction methods use vector element parsing for drawings, deep learning for text and sliding‑window strategies for tables to enable accurate parameter extraction[\[1\]](https://www.mdpi.com/2075-5309/15/22/4048). Studies also note that as‑built data is scattered across heterogeneous formats, making purely rule‑based or mono‑modal methods unreliable; effective automation must therefore parse drawings, textual descriptions and tables together and integrate the extracted information[\[2\]](https://www.mdpi.com/2075-5309/15/22/4048#:~:text=During%20the%203D%20modeling%20process%2C,technologies%20to%20provide%20reliable%20data).

Our product goal is to give estimators a co‑pilot that emulates the way an experienced estimator reads a plan set: first identify sheet types and their content, then absorb notes and code, then match symbols with definitions, and finally tally quantities. To achieve this with AI we need to:

1. **Segment pages into meaningful regions** (text blocks, tables, drawings, legends, schedules) using a layout‑analysis model. This mirrors how a human’s eye separates a sheet into paragraphs, diagrams and tables.

2. **Use dedicated models for each region type** (OCR/LLM for text, layout‑aware models for tables, vision models for drawings), then merge the outputs into a unified graph.

3. **Treat symbol definitions and instances differently.** A legend may define “a diamond with 2 Xs means wall assembly W12”, while instances on plans may be labelled “5Wa” or “6B”; we must let the user seed the definitions and then detect instances automatically.

4. **Create entities at the right time:** region entities (drawings, legends, schedules) should be created immediately after segmentation, while semantic entities (scopes, legend items, assemblies) are created after reasoning on their content.

5. **Refine scopes with visual evidence:** a first draft of scopes can be proposed from textual notes, but the final, granular scopes must be anchored to symbols, notes and drawings.

## 2 High‑level processing flow

The following flow describes how the system should process a document from upload to fully‑linked knowledge graph. At each stage we specify the main objective, the expected AI tools (LLM, vision model, etc.), and when entities are created. The stages are arranged to maximise early human feedback and progressive enrichment.

### 2.1 Ingestion & page rasterisation

1. **Render each PDF sheet** into a high‑resolution image and collect metadata (rotation, dimensions). Raster images are stored as tiles to allow multiscale processing. Existing OCR JSON is also loaded when available.

2. **Run a document‑layout model** (e.g. DocLayNet‑style segmentation) to detect and classify regions such as titles, paragraphs, tables, images/drawings, legends and schedules. This step provides bounding boxes and coarse labels for every region on the page. The MDPI study shows that using vector parsing and sliding‑window detection for tables enables accurate extraction from heterogeneous layouts[\[1\]](https://www.mdpi.com/2075-5309/15/22/4048); we adopt the same philosophy here.

3. **Create region‑level entities** immediately:

4. A **Drawing** entity for each region classified as a floor plan, section, elevation or detail. These may be nested; e.g. a sheet could contain three floor‑plan drawings.

5. A **Legend** entity for each legend or glossary area.

6. A **Schedule** entity for each table area (door schedule, window schedule, etc.).

7. An **AssemblyGroup** entity for each page that contains detailed assemblies (wall, roof, floor assembly sheets like a6.00).

8. A **Note** entity for each paragraph or block of text that is not part of a legend or schedule. Notes include general notes, code compliance, scope narratives, etc. These entities are created via the existing CreateEntityUseCase with status='incomplete'; their bounding boxes and sheet numbers come from the layout model. At this point no semantic links exist.

### 2.2 Text extraction and classification (top‑down)

1. **Perform OCR** on all text‑containing regions (notes, legends, schedules, table headers). Where OCR already exists, align it with the region boxes. We need bounding boxes per line or cell and typography metadata.

2. **Classify and parse text blocks** using an instruction‑tuned LLM combined with heuristics:

3. For each Note entity, ask the LLM to decide if the text describes a **scope of work**, a **general note**, a **code requirement**, or another category. The LLM should return structured data: scope name, description, referenced assemblies (if any) and evidence location. This uses our top‑down expertise; the MDPI paper suggests combining regular expressions and domain dictionaries with deep models to improve unstructured parameter extraction[\[1\]](https://www.mdpi.com/2075-5309/15/22/4048).

4. For each Legend, parse the legend table into **LegendItem** entities: symbol code, description and associated assembly or component name. Use table‑understanding models for structured extraction.

5. For each Schedule, parse rows into **ScheduleItem** entities: e.g. door number, size, material, fire rating.

6. For each AssemblyGroup, summarise each detail into an **Assembly** entity: assembly identifier (e.g. W12), composition (stud, insulation, sheathing), and performance metrics. Use a mix of OCR and LLM summarisation.

7. **Create semantic entities** (Scope, LegendItem, ScheduleItem, Assembly) from the parsed output via CreateEntityUseCase. Each entity references its parent region entity and carries status='incomplete' for human review.

### 2.3 Seed symbol definitions (human‑assisted)

1. **User seeds symbol families** by selecting one or more definition glyphs in a Legend or Assembly diagram. For example, the user might select the diamond with two Xs representing “Assembly marker” and map it to the Assembly entity “W12”. These selections are cropped into small patches and stored as **SymbolFamily** objects along with their embeddings (CLIP or similar). Each family is linked to a SymbolDefinition entity referencing a LegendItem or Assembly definition.

### 2.4 Symbol candidate detection (visual bottom‑up)

1. **Detect symbol candidates** across all Drawing entities using a vision model (e.g. YOLOv8) at multiple scales. Each detection is a bounding box and class confidence. Convert pixel boxes back to PDF coordinates via the existing coordinate system. These are not yet persisted as entities; they are internal symbol candidates.

2. **Associate candidates with families** by computing embeddings for each candidate crop and matching to seeded SymbolFamily centroids. If a candidate’s similarity exceeds a threshold, propose a SymbolInstance entity with the associated SymbolDefinition (derived from the family). Otherwise mark it as unknown for human review.

3. **Recognise nearby text labels** by searching for OCR text within a small radius of each candidate box. For construction assemblies this might capture codes like “5Wa” or “6B”. Use heuristics and an LLM to distinguish labels from other text. The label helps resolve which assembly or schedule row the instance corresponds to. If an instance is ambiguous or the label does not match any known definition, flag it for manual correction.

4. **Create SymbolInstance entities** via the use case once a candidate is matched and labelled. Link each instance to its SymbolDefinition, and (where possible) to a LegendItem, ScheduleItem or Assembly based on the label.

### 2.5 Cross‑modal linking and scope synthesis

1. **Spatial linking:** For each Note describing a scope or referencing an assembly, use the SpatialAnalyzer to find which drawings overlap or are near the note’s bounding box. Establish links from the Scope entity to the relevant Drawing entities. Similarly, link each SymbolInstance to the Drawing it lies within (this is implicit when the symbol’s box intersects the drawing’s box).

2. **Semantic linking:** Use text similarity (CLIP embeddings) and LLM reasoning to connect SymbolInstance labels with LegendItem descriptions, Assembly composition, and ScheduleItem rows. For example, if a note says “provide W12 walls for all exterior elevations” then all SymbolInstance entities labelled W12 on exterior drawings should be linked to that scope. The MDPI paper emphasises combining spatial analysis with semantic cues to integrate modalities for modelling[\[1\]](https://www.mdpi.com/2075-5309/15/22/4048).

3. **Scope slicing:** For each Scope, gather all linked evidence (notes, symbols, schedule items) and cluster it by spatial area (e.g. floor, level, area). Emit finer‑grained **ScopeSlice** objects representing work on a specific area with specific assemblies. Each ScopeSlice inherits from the parent Scope but has a set of SymbolInstance and note links. These slices are the units for quantity takeoff.

### 2.6 Discrepancy detection & refinement

1. **Multi‑agent validation:** Once the initial graph is assembled, run specialised agents to check for missing or inconsistent information:

2. **Legend auditor:** Compares the number of legend items with the number of SymbolDefinition objects and highlights unused or orphaned definitions.

3. **Coverage checker:** Compares schedule rows with linked instances to detect doors or assemblies specified but not placed or vice versa.

4. **Cross‑sheet reference resolver:** Uses the LLM to interpret notes referencing other sheets (e.g. “See 4/A6.00”) and ensures the referenced drawing or assembly exists.

5. **Scope completeness agent:** For each scope, ensures that all expected floors or areas have ScopeSlice coverage; missing slices are flagged.

6. **Produce a refinement report** listing issues. Surface them in the UI for human review and corrections. Corrections feed back into the graph (e.g. adding missing symbol seeds or fixing mislabelled instances).

### 2.7 Chat & measurement (future phases)

1. **Chat interface:** Use Retrieval‑Augmented Generation over the knowledge graph, OCR text and cropped images to answer questions about the project. Chat responses cite both text and image evidence and can propose new links. This phase leverages earlier work but is not in scope for the core parsing pipeline.

2. **Measurement and takeoff:** After scopes and symbols are correctly linked, integrate measurement tools (polylines and polygons) and scale detection. Combine these with symbol counts to compute quantities (linear feet, square footage, eaches). This will require additional models (e.g. SAM‑2) for boundary suggestions.

## 3 Bridging human and AI reasoning

The pipeline above deliberately mirrors how a human estimator works:

1. **Early segmentation** makes it clear what kind of content is on each page. Humans quickly recognise where drawings, legends and tables lie; our layout model provides the same grouping to the LLM and vision components.

2. **Region‑first entity creation** ensures that AI never writes to the graph without an explicit spatial context; users can immediately see and adjust region boxes before deeper analysis.

3. **Top‑down reasoning on text** happens before any symbols are detected. A human reads general notes and code sheets first to understand project scope; our pipeline extracts scopes from notes early, producing draft Scope entities that anchor subsequent linking.

4. **Symbol family seeding** allows the user to teach the system which glyph corresponds to which definition—similar to how an estimator learns the legend before counting symbols. This step ensures the bottom‑up detector can generalise across the plan set while keeping the user in control.

5. **Cross‑modal linking** emulates the mental process of matching callouts on the drawing to definitions in the legend and schedule. Spatial proximity plus text similarity replicates the “glance back and forth” pattern of a human reading a plan and its notes.

6. **Scope slicing** replicates the estimator’s breakdown by area and assembly. Humans might create a spreadsheet row for “Framing – Level 1 – West Wing – Assembly W12”; our ScopeSlice objects serve the same purpose programmatically.

## 4 Deliverables and evaluation

To implement this pipeline, engineering should produce the following deliverables:

1. **Layout segmentation service**: a containerised model (pre‑trained or fine‑tuned) that accepts a page image and returns region boxes and labels. It should be accessible via the existing AI service interface.

2. **Text‑classification and parsing scripts**: LLM prompts and parsers for notes, legends, schedules and assemblies. Each parser should output structured JSON ready for CreateEntityUseCase.

3. **Symbol detection prototypes**: a Colab notebook for training/testing symbol detectors, plus an inference wrapper integrated into the backend. Provide a way to embed symbol crops and perform family matching.

4. **Linking algorithms**: functions that take entities and compute spatial and semantic links, using existing SpatialAnalyzer and CLIP embeddings.

5. **Scope‑slicing logic**: code to cluster linked evidence into ScopeSlice groups.

6. **Validation agents and reports**: LangGraph workflows for the discrepancy detection agents described above.

### Evaluation criteria

* **Segmentation quality:** Intersection‑over‑union (IoU) between predicted region boxes and manual annotations on a validation set. Aim for \>80 % IoU on major region types.

* **Text entity accuracy:** Precision/recall on Scope, LegendItem and ScheduleItem extraction tasks compared against a gold set. Target \>85 % precision and \>80 % recall.

* **Symbol detection:** Precision/recall on symbol instances across diverse sheets, stratified by symbol family. Target \>70 % precision after user seeding; recall may be lower due to partial training.

* **Linking accuracy:** Percentage of symbol instances correctly linked to their definitions and schedule rows. Evaluate on curated samples.

* **Scope slice completeness:** For a given scope, percentage of actual areas covered by AI‑generated slices. Manual ground truth is required.

* **Human‑in‑the‑loop efficiency:** Average time saved per page compared to manual annotation alone; track how many AI suggestions are accepted or corrected.

## 5 Conclusion

This PRD defines a multi‑stage, multimodal processing pipeline that treats text, drawings and tables as first‑class citizens. By segmenting pages early, creating region entities before semantics, and intertwining top‑down and bottom‑up reasoning, we can build a knowledge graph that captures the richness of construction documents. The MDPI study on architectural multi‑modal data parsing confirms the need to combine vector‑based drawing analysis, deep learning for text, and sliding‑window table detection[\[1\]](https://www.mdpi.com/2075-5309/15/22/4048), and highlights how heterogeneous data demands integrated processing[\[2\]](https://www.mdpi.com/2075-5309/15/22/4048#:~:text=During%20the%203D%20modeling%20process%2C,technologies%20to%20provide%20reliable%20data). Our plan aligns with these findings and adapts them for the takeoff and estimation domain, ensuring that automation remains transparent, traceable and human‑guided at every step.

---

[\[1\]](https://www.mdpi.com/2075-5309/15/22/4048) [\[2\]](https://www.mdpi.com/2075-5309/15/22/4048#:~:text=During%20the%203D%20modeling%20process%2C,technologies%20to%20provide%20reliable%20data) A Study on Methods for Parsing Architectural Multi-Modal Data and Extracting Modeling Parameters

[https://www.mdpi.com/2075-5309/15/22/4048](https://www.mdpi.com/2075-5309/15/22/4048)