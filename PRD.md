1. Product Overview
Product Name: Worldscribe
Summary:
A lightweight, markdown-based worldbuilding wiki that includes:
An atlas (map) module for visualizing locations and linking them to wiki entries.
A calendar/timeline module for tracking events and dates.
AI integration to help users generate or refine content within the same platform (e.g., connecting Anthropic’s Claude or OpenAI’s ChatGPT via API).
Core Audience:
TTRPG Game Masters who want a quick way to organize campaign lore, maps, and timelines.
Fiction writers who need a structured but low-friction wiki for building settings.
Solo creators seeking easy AI-assisted idea generation or text refinement.
Value Proposition:
Markdown simplicity: Allows creators to focus on writing without wrestling with complicated formatting tools.
Seamless map & calendar modules: Two of the most demanded features in worldbuilding circles, available out of the box.
Integrated AI assistant: Offloads repetitive tasks (e.g., generating quick NPC bios, summarizing sections) while letting creators stay in full control.

2. Goals & Objectives
Deliver a frictionless wiki: Must be easy enough for non-technical users to pick up.
Provide essential modules (maps & calendars): GMs and authors consistently request these as the heart of any worldbuilding system.
Ensure minimal setup: Users can create content immediately, with no steep learning curve or forced “template overload.”
Embed AI support: Offer a built-in AI prompt (Claude or ChatGPT) so users can brainstorm, expand sections, or fill placeholders—without leaving the app.
Offer core collaboration/sharing options: At minimum, a way to export or share content with players/readers in read-only mode.

3. Key Features & Requirements
3.1 Wiki (Markdown-Based)
Markdown Editor:
Users can create articles in plain text Markdown.
The wiki should have a /command menu allowing for easy styling in markdown (e.g. /h3 or /bullet)
Real-time preview of Markdown formatting.
Minimal overhead: no complicated forms or mandatory fields.
Article Management:
Tagging/categories to group articles (e.g., “Locations,” “Factions,” “Characters”).
Quick linking: typing [[ or @ suggests existing articles to embed links seamlessly (akin to Obsidian or Notion).
Basic revision history: allow users to revert to a previous version if needed.
Search & Navigation:
Full-text search for article titles and body text. If possible leverage the AI tools to augment and make available natural language search.
Filter by tags or categories.
Optional sidebar or table of contents for quick jumps between sections.
Rationale: Many competitors overwhelm new users with prebuilt forms (e.g., 20+ fields for a location). By keeping it Markdown-first, we give creators immediate freedom and simplicity.
3.2 Atlas (Maps) Module
Map Upload & Display:
Users can upload image files (JPEG/PNG) as the base map.
Pan/zoom functionality to navigate large maps.
Pins & Linking:
Let users drop pins (markers) that link to relevant wiki articles (locations, events, NPCs).
Clicking a pin opens a small preview or hyperlink to that article.
Basic Layer Management (Stretch Goal):
(If time permits) Support multiple layers (e.g., political borders, hidden GM layer) or at least an on/off toggle for pins.
If not feasible in MVP, ensure the architecture can accommodate layering later.
Rationale: Users switching from older tools repeatedly cite “interactive maps” as a must-have.
3.3 Calendar/Timeline Module
Date & Event Tracking:
A simple timeline where users can log events (e.g., “Battle of Greenfields, Year 512”).
Option to create a custom naming scheme for months, days, or eras.
Event-to-Article Linking:
Clicking on an event can link to a wiki page that describes it in detail.
Conversely, a wiki article can reference which timeline events it’s tied to.
Basic Chronological View (MVP):
A list or scrollable timeline of events.
More advanced features (parallel timelines, branching “what-if” scenarios) can come in a later release.
Rationale: Timelines/calendars are the second-most-requested feature after maps, allowing GMs and writers to keep track of historical events.
3.4 AI Integration
AI Provider:
Allow for integration of ChatGPT (OpenAI) via API keys..
Context-Aware Prompts:
When the user highlights text or is editing an article, they can click “AI Assist” to open a small chat or command interface.
The system sends the relevant context (e.g., the article’s title and some content) to the AI, then displays the result as a draft or suggestion.
In cases where users ask for the creation of a complete new article, find a way to pull context from other nested or hyperlinked articles. (e.g. if a user attempts to create an NPC inside a town the AI should pull context from the town)
In future developments the goal should be to pull context from all 2nd and 3rd order linked articles.
Common AI Use Cases:
Generate a short draft based on a user prompt (e.g., “Draft a description of this city’s origin story”).
Refine or rewrite existing text (e.g., “Make this sound like it was written by the local bard”).
Brainstorm (user requests “Give me 5 festival ideas that fit this city’s cold climate”).
User-Controlled Output:
The AI’s suggestions should always be editable. Never overwrite user text automatically.
Mark or highlight AI-generated sections so users know what was produced by AI.
Rationale: Users frequently copy-paste content into ChatGPT or Claude for expansions or rewrites. Integrating AI in-app removes friction and ensures consistent context.
3.5 Basic Sharing & Export
Read-Only Sharing:
Provide a simple toggle: “Share my world publicly” or “Private.”
If “Public,” generate a shareable link that shows the wiki in read-only mode.
Map pins should be clickable, but editing disabled.
Markdown/HTML Export:
Users can export their entire wiki as Markdown files or a static HTML bundle.
This fosters trust that they own their data and can back it up offline.
Rationale: Many creators fear losing data if a service shuts down; open export options ease that fear.
3.6 MVP Non-Goals (Explicit Exclusions)
Advanced Team Collaboration: Real-time multi-user editing is nice-to-have but not required in v1.
Complex Role/Permission System: We’ll start with a simple “public or private” model for MVP.
Deep Theming/Customization: Keep styling minimal; focus on function.
Offline/Desktop App: MVP will be web-based. Offline mode could be a next-phase feature.

4. User Stories (MVP)
Create a wiki article in Markdown
“As a GM, I want to create a new city page quickly using Markdown so I can easily write, format text, and insert headings without fuss.”
Pin a location on a map
“As a writer, I want to upload a map of my fantasy continent and drop pins for key cities, each linking to a separate wiki page.”
Log timeline events
“As a GM, I want to add major campaign events to a timeline so I can keep track of chronological order.”
Use AI to draft content
“As a writer, I want to highlight an empty city article and ask the AI for a starting paragraph, so I don’t stare at a blank page.”
Export or share my world
“As a GM, I want to share a read-only link of my map and timeline with my players, so they can reference the lore we’ve already revealed.”

5. Technical Requirements
Tech Stack
Frontend: Lightweight framework (e.g., React or Vue) with a user-friendly Markdown editor component.
Backend: Could be Node.js, Python (FastAPI, Flask), or similar — must handle authentication, data storage, and handle AI calls.
Database: A simple document store (MongoDB, PostgreSQL with JSON fields) or even a low-code BaaS if you’re not coding.
Hosting: Any cloud service that supports the chosen stack (AWS, Azure, Heroku, etc.).
AI Integration
Use official Anthropic/OpenAI SDK or an HTTP-based API call.
Implement usage limits or warnings if daily token usage is exceeded.
Performance Benchmarks
The wiki must load an article in < 1 second on average.
Map view should support images up to 4096×4096 resolution without excessive lag.
Security & Data Protection
Basic user authentication (login, logout).
Encryption in transit (HTTPS).

6. Dependencies & Partnerships
Map Hosting/Images: Encourage users to keep map file sizes reasonable. Possibly integrate an image hosting solution if desired.
Licenses & Compliance: Ensure the chosen AI model’s usage policy allows creative use and does not store private user data beyond ephemeral calls.

7. Milestones / Timeline
Phase 1: Setup & Core Wiki
Implement user authentication.
Build basic Markdown editor + article creation flow.
Set up data model for articles (title, body, tags).
Add search capability.
Phase 2: Atlas & Calendar Modules
Integrate map upload and pinning system.
Create timeline view with event creation.
Link timeline events to articles.
Phase 3: AI Integration
Connect a minimal “AI Assist” feature for drafting/refining text.
Phase 4: Sharing & Basic Export
Implement “public or private” toggle.
Generate shareable read-only links.
Markdown/HTML export option.

8. Acceptance Criteria
Markdown Wiki:
Users can create/edit articles with live preview.
Adjust styling using a /command menu
Linking articles via [[ or @ is functional.
Maps:
Users can upload a map image, drop at least 20 pins without performance issues.
Pins open an article in a small pop-up/sidebar or link to a new page.
Timeline:
Users can add events with custom date naming.
Events link to articles; articles display references to those events.
AI Assistance:
Users can highlight text or click a “Generate Draft” button.
AI-suggested text is inserted in a distinct or highlighted area for user approval.
Sharing & Export:
Public worlds accessible via unique URL in read-only mode.
Bulk export produces valid Markdown or a static HTML archive.

9. Future Enhancements (Post-MVP)
Collaboration: Real-time multi-user editing, role-based permissions.
Advanced Timeline: Multiple parallel timelines, visual “scroll” interface, branching events.
Offline/Desktop Support: Possibly using Electron or Tauri to package as a local app.
More Robust AI Context: Storing entire world-lore context so the AI can answer in-depth queries (“What are the major exports of this nation?”).
AI-Generated Maps/Images: On-demand concept art for locations or NPC portraits integrated models.
Plugin System: Let advanced users build expansions for custom RPG systems or deeper linking with VTT platforms.

10. Conclusion
This MVP PRD focuses on simplicity, essential modules, and integrated AI. You’ll provide a user-friendly Markdown wiki with an interactive map and basic timeline, then enhance it with AI-driven content creation. By keeping the feature set tight in v1, you can get something tangible online quickly, gather feedback from early adopters, and iterate — rather than attempting a monolithic “mega platform” right away.
Building from here, you can gradually incorporate real-time collaboration, more advanced calendar tools, or offline modes. But to start, the above features form a clear, achievable foundation that addresses the biggest immediate user pains: frictionless note-taking, essential worldbuilding modules, and a handy AI co-writer.
