So far our Timbergem app is making good progress in allowing a user to add all the entities that comprise the Knowledge Graph (KG) and  navigate the project to quickly view such entities/nodes. However, the main limitation is that all the editing has to happen in the Right Knowledge Panel (KP). This can become unweildy since we're dealing with lots of nodes and relationships, and clicking between KP and canvas is tiresome. 

I want to pivot instead to a canvas-centric flow. I am inspired by the Design App Canva (see canva1 and canva2 screenshots), which has a very dynamic canvas context menu experience. 
For timbergem, I want the canvas to be the primary UI for adding, editing, and linking entities. Most of our Backend Linkages can remain the same, with an important exception:

We will be more flexible and permissive in allowing users to add entities without the previously required linkages:
1. Symbol instances can now be added anywhere, without requiring a drawing
2. Symbol instances do not need a definition
3. Etc. 

THis allows the user to quickly "put onto paper" the KG in his head, without limiting him to working within our framework. However, we will keep note of entities that are missing expected linkages and all the user to quickly review these items (in a Side panel as well as visually represented by, say, a red dashed border).

Symbols are a focal point in our KG. Symbols link visual context with semantic context. Specifically:
- A symbol has a visual symbol definition somewhere. For example:
    - a small circled three is visually defined by defined by a circled x at the top of a keynote legend (see blue boxed circle in screenshot)
        - Note: this circled x may only exist on one sheet's keynotes, although it can be implied in all future sheets (i.e all circled numbers are semantically defined on their corresponding sheet's keynote legend.)
    - a diamond in a plan sheet with the text W6a is visually defined in the first page Typical Drawing Symbols with a diamond with XX inside. 
- A symbol also has a semantic definition. In the case of our circled (3) and our diamond <W6a>:
    - Depending on the sheet, the corresponding keynote on that legend will indicate what a circled 3 means. FOr example, it may mean `3. install 1/2” min gwb under stair as required per IRC R302.7, typ.` on one page and `3. remove existing wall/ portion of wall per plan. refer to structural drawings` on another. 
    - Since the diamond symbol refers to an assembly, we can find the semantic definition of of W6a in our Assemblies Schedule. For instance it is an assembly schematic accompanied with the descriptive text
    ```
        W6a
        typ interior wall

        interior
        -new paint
        - existing/ new 1/2" gypsum 
        wall board per plan
        -existing/ new  2x4 framing per 
        plan, fill cavity with batt 
        insulation @ new walls
        - existing/ new 1/2" gypsum 
        wall board per plan
        -new paint
        interior 
    ```
So, starting with a symbol instance on a page, we can determine its visual definition (what kind of symbol is it) and use that to figure out its semantic definition (what does it mean). From there, we can connect it with a Scope. The location of the symbol tells us where the work is happening, and the meaning of the symbol tells us what is happening. Which is the baseline information needed to determine a scope. Of course, there is other information such as how much (materials/measurements) and additional data (notes, for example), but the symbol is the focal point to get us linked to Scope KG nodes as quickly as possible.

The new UI/Canvas flow is supposed to make it as easy and seamless as possible to annotate symbols and connect them with existing visual/semantic definitions OR create new visual/semantic definitions on the fly. Here are a few sample workflows to demonstrate:


1. I left click and drag a bounding box. A context menu will appear, asking me to designate the Entity for this bounding box. I can select any entity (Drawing, Schedule, Symbol Instance, etc). After I select the entity type, I am then dynamically provided with the options to link that Entity. 

    a. if it's a Drawing, no Linkages are needed. But the dialog box will appear allowsing me to enter in the title and description of that drawing right next to where i drew its bounding box (smooth ui)
    b. If it's a symbol instance, the dialog box will give me a to fields (for visual and semantic definition):
        - I will be able to search for all existing entities (symbol definitions, in this case) in my project and if non exist as I'm typing, I will see a button to create new symbol definition. At that point, I can navigate to any page and add a symbol definition (by definining its bounding box) and give it the necessary information (name, description etc.). At that moment, my symbol instance has been linked with the new Symbol Definition. When I click on that symbol definition, i see in the context menu its connected INstances (with the option to create/stamp new ones, of course). If I click on the symbol instance I just linked, I am taken directly to that page, with the symbol instance selected. There, I can continue filling in the details, namely the Semantic Definition of that symbol. 
            - Note that this cross-sheet linking and na igating needs to be facilitated by the Side panels, whcih provide a list view, for instance of the various symbol instances and definitions so that the user does not get disoriented while building out the KG. 
        - Next I will want to connect to the semantic definition, which is essentially a scope, in our data model. Here lies an additional UI improvement, namely seamless OCR text integration. IN this case, most of our Symbol Keynote Legend (as well as Schedules, etc) are well OCR'd, so we want the user to minimize typing as much as possible. WHen I click to link Semantic Definition, I can begin typing the meaning. If i have already linked a similar SI and have already linked/created a semantic meaning (which is basically a scope), then I can click and move on. If i haven't already created a scope, I can semlessly select (and/or right click) an ocr block and fill in the field to complete the symbol <-> linkage

2. Very similar to Flow #1 , except instead of left click-drag, i right click once and am given the option to add an entity. Everything similar flows from there
3. If i don't complete the linkages for an entity (for example, an SI without a scope linkage), it will glow or outline red, and i can click it and complete filling out its form. Alternately, I can explore the KP and see a single "Needs Attention" that shows all incomplete KG entities.

The emphasis of these flows are on rapidity of building out the KG. THe user doesn't have to follow a pre-defined workflow, and can partially build out the knowledge graph and complete all the linkages at his convenience. 

Now that I've discussed a bit about the UX, I'd like to focus on the UI and design language/paradigm of the app. We made some improvements in the ui_overhaul branch, but we're still a ways away from a modern professional app that handles a lot of complexity. As I noted before I am inspired by the app Canva, which is very feature rich yet highly accessible and intutitive. 

Let's look at a how canva handles menus

1. Canva_Menu_1: Canvas menus are intuitive and off to the sides (top, left, bottom).
    a. Left Menu contains different aspects/elements that a user may be interested in. Upon hovering over one of the submenus, it expands (canva_Menu_2), and if the user clicks on that menu it persists in expanded mode. Even when it's hover expanded, it interacts smoothly with the cursor, allowing the user to scroll within the submenu and if the cursor moves to the canvas, it automatically collapses (unless the user has previously clicked the submenu button)
    b. The Bottom Menu/Toolbar contains helpful utilities such as zoom, notes, and timer, as well as various ways of exploring multiple pages: grid view and a page Thumbnail navigator (canva_Menu_3)
    c. Top Menu/Toolbar (canva_Menu_4) contains a hamburger menu which expands a User/Account Menu (not related to the current Project), a File Menu which includes various utilities, and a Editing/Viewing/Commenting Mode toggle. It also includes the Undo/Redo Buttons and a "Saved to Cloud" Indicator. 

As previously indicated in previous screenshots, Canva also handles context menus dynamically. Aslecting an element on the canvas can bring up helpful buttons (add comment, change styling, etc), and right clicking also brings up various useful user actions (copy, lock, duplicate, etc.) to interact with the element and canvas (paste, add new element, etc.)

My intention for surveing Canva's menus and UI/UX is not so that we copy it, but so that we're inspired by how they handle a lot of complexity in a modern, clean, and intuitive manner.

Another Application that we should be inspired by is Airtable. As seen in the screenshots (airtable_1 and airtable_2), the Dialog box for creating a new Entity comes with fields for linkages, clicking that Record Linkage button opens up a search bar, with the option to create a new record on the fly (with details to be filled in later at the user's convenience). Again we should be inspired by this flexible and agile UX.