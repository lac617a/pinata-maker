# AGENTS.md

## Piñata Maker

This file defines the engineering rules, architectural constraints, development workflow, and documentation standards for the Piñata Maker project.

The agent MUST read and follow this document before modifying the codebase.

---

# 1. Project Goal

Piñata Maker is a tool for creating, editing, preparing, and printing piñata figures.

The system must allow users to work with:

* Templates
* Geometric pieces
* Images
* Processed assets
* Assemblies
* Editor state
* Print layouts
* PDF exports

The primary goal is to produce **correct, printable, physically usable results**, not merely visually attractive screens.

---

# 2. Development Philosophy

The project prioritizes:

1. Correctness
2. Maintainability
3. Domain clarity
4. Predictable behavior
5. Testability
6. Explicit boundaries
7. Reusable patterns
8. Documentation
9. Small and intentional abstractions

Do not optimize for the smallest amount of code.

Do not optimize for the largest amount of abstraction.

Optimize for **clear responsibility and predictable behavior**.

---

# 3. Golden Rule

Before implementing a feature, determine:

```text
What problem does this solve?
Where does this responsibility belong?
What existing domain concept represents it?
What existing abstraction can be reused?
What documentation defines the expected behavior?
```

Do not immediately create a component, hook, service, utility, or type.

---

# 4. Documentation Is Part of the Architecture

The `docs/` directory is part of the project's source of truth.

The agent MUST consult the relevant documentation before making changes.

Current documentation:

```text
docs/
├── PRD.md
├── architecture.md
├── domain.md
├── geometry.md
├── image-processing.md
├── template.md
├── assembly.md
├── editor.md
├── printing.md
├── pdf.md
├── storage.md
└── roadmap.md
```

---

# 5. Documentation Responsibility

Each document has a specific responsibility.

### PRD.md

Defines:

```text
product goals
features
MVP scope
user requirements
non-goals
acceptance criteria
```

Use it to understand **what the product should do**.

---

### architecture.md

Defines:

```text
system architecture
layers
dependencies
boundaries
patterns
application flow
technical decisions
```

Use it to understand **how the system is structured**.

---

### domain.md

Defines:

```text
domain concepts
entities
value objects
invariants
business rules
domain terminology
```

Use it to understand **what the system means**.

---

### geometry.md

Defines:

```text
dimensions
coordinates
units
transformations
scaling
rotation
measurements
geometric rules
```

Use it whenever working with physical dimensions or geometry.

---

### image-processing.md

Defines:

```text
image preparation
background removal
cropping
resolution
transparency
processing pipeline
image metadata
```

Use it whenever manipulating user images.

---

### template.md

Defines:

```text
template structure
template configuration
template versions
piece definitions
template lifecycle
```

Use it whenever creating or modifying templates.

---

### assembly.md

Defines:

```text
piece relationships
assembly rules
connections
ordering
validation
physical construction
```

Use it whenever working with how pieces form the final piñata.

---

### editor.md

Defines:

```text
editor state
selection
interaction
viewport
commands
undo/redo
editing behavior
```

Use it whenever modifying editor functionality.

---

### printing.md

Defines:

```text
print dimensions
paper configuration
margins
scaling
tiling
page layout
print validation
```

Use it whenever dealing with physical printing.

---

### pdf.md

Defines:

```text
PDF generation
page creation
vector/raster behavior
PDF metadata
export validation
```

Use it whenever generating or modifying PDFs.

---

### storage.md

Defines:

```text
persistence
repositories
database
object storage
assets
versions
exports
storage lifecycle
```

Use it whenever dealing with persistence or files.

---

### usage.md

Defines:

```text
access levels
daily limits
anonymous identification
when usage is counted
usage API
```

Use it whenever an action counts against the daily limit.

---

### legal.md

Defines:

```text
legal pages
site owner data
what the privacy texts must reflect
cookie consent
```

Use it whenever a change alters what data is stored, for how long or by whom.

---

### seo.md

Defines:

```text
indexable pages
metadata and canonical URLs
sitemap and robots
what stays out of search engines
```

Use it whenever adding a public page or changing what is indexed.

---

### roadmap.md

Defines:

```text
what is already implemented
closed decisions
pending phases
open questions
known debt
MVP acceptance coverage
```

Use it to understand **where the project currently stands**.

It records state, not behavior. It must not be used as a source of
requirements, and it must be updated when a phase is completed.

---

# 6. Documentation Precedence

When implementing behavior, use this order:

```text
PRD
 ↓
Domain
 ↓
Architecture
 ↓
Specific subsystem documentation
 ↓
Existing implementation
```

If existing code conflicts with documented behavior, do not silently preserve the incorrect behavior.

Determine whether:

```text
documentation is outdated
implementation is incorrect
requirement has changed
```

Then update the appropriate documentation when necessary.

---

# 7. No Generic Solutions

Do not implement generic abstractions without a concrete requirement.

Avoid creating things such as:

```text
GenericService
GenericManager
GenericHelper
GenericProcessor
GenericRepository
GenericUtils
BaseEntity
BaseService
BaseController
```

unless there is a demonstrated need.

Prefer domain-specific names:

```text
TemplateRepository
AssetRepository
PdfGenerator
PrintLayoutCalculator
ImageProcessor
AssemblyValidator
```

---

# 8. Domain First

Business rules belong to the domain.

Do not put domain rules inside:

```text
React components
hooks
API routes
database repositories
UI utilities
```

Example:

Bad:

```typescript
if (width > 100 && height < 50) {
    // business rule
}
```

inside a React component.

Prefer:

```text
Domain
 ↓
Rule / Value Object / Entity
 ↓
UI consumes result
```

---

# 9. Separation of Concerns

The project must maintain clear boundaries.

```text
Presentation
    ↓
Application
    ↓
Domain
    ↓
Infrastructure
```

Infrastructure must not leak into the domain.

---

# 10. Dependency Direction

Dependencies should point inward.

```text
Presentation
      ↓
Application
      ↓
Domain
```

Infrastructure implements interfaces required by inner layers.

The domain must not depend on:

```text
React
Next.js
Supabase
Postgres
Browser APIs
DOM
Object Storage SDKs
PDF libraries
Image-processing libraries
```

unless explicitly justified by architecture documentation.

---

# 11. Repository Pattern

Persistence must use repository abstractions where appropriate.

Example:

```typescript
interface TemplateRepository {
    getById(id: TemplateId): Promise<Template | null>;
    save(template: Template): Promise<void>;
}
```

Infrastructure implements the interface.

The domain/application layer must not directly use database clients.

---

# 12. Storage Boundary

Database and object storage are infrastructure concerns.

```text
Domain
   ↓
Repository Interface
   ↓
Infrastructure Adapter
   ↓
Database / Object Storage
```

Do not expose:

```text
SupabaseClient
Storage SDK
Database Row
```

to the domain.

See:

```text
docs/storage.md
```

---

# 13. Geometry Rules

Physical dimensions must never be treated as arbitrary UI pixels.

Always distinguish between:

```text
physical units
document units
screen pixels
```

Do not silently convert between them.

All geometry calculations must follow:

```text
docs/geometry.md
```

---

# 14. Units

Never assume a unit.

Explicitly define whether a value represents:

```text
mm
cm
in
px
pt
```

A value such as:

```typescript
width: 100
```

is invalid domain modeling if the unit is ambiguous.

Prefer explicit semantics.

---

# 15. Printing Is Physical

Printing behavior must prioritize physical correctness.

Never assume:

```text
CSS pixels === printed size
```

Print calculations must follow:

```text
docs/printing.md
```

---

# 16. PDF Is an Export Boundary

PDF generation is not the source of truth for the domain.

The flow should conceptually be:

```text
Domain
 ↓
Print Layout
 ↓
PDF Generator
 ↓
PDF Artifact
```

The PDF must represent the calculated print result.

See:

```text
docs/pdf.md
```

---

# 17. Template Immutability

Published template versions should be treated as immutable.

Instead of modifying:

```text
Template v3
```

create:

```text
Template v4
```

when the domain requires versioning.

See:

```text
docs/template.md
docs/storage.md
```

---

# 18. Generated Files

Generated files such as PDFs are artifacts.

They must not replace the underlying domain model.

```text
Template
Assembly
Print Layout
   ↓
PDF
```

The generated artifact should reference the versions used to create it when required.

---

# 19. Original Assets

Original user assets should remain separate from processed assets when the product requires future editing or reproducibility.

```text
Original
   ↓
Processing
   ↓
Processed
```

Do not overwrite originals by default.

See:

```text
docs/image-processing.md
docs/storage.md
```

---

# 20. Editor Rules

The editor is responsible for interaction.

It must not become the source of truth for business rules.

Avoid putting:

```text
geometry rules
assembly rules
template validation
printing rules
```

directly inside editor components.

See:

```text
docs/editor.md
```

---

# 21. State Management

Use the smallest state scope possible.

Before introducing global state, determine whether the state belongs to:

```text
component
feature
editor
application
server
domain
```

Do not introduce global state simply for convenience.

---

# 22. Hooks

Hooks should coordinate behavior.

They should not become containers for unrelated business logic.

Avoid:

```text
useEverything()
useProjectManager()
useGlobalProcessor()
```

Prefer focused hooks.

Example:

```text
useTemplateEditor()
useSelection()
useViewport()
usePrintPreview()
```

when those concepts actually exist.

---

# 23. Components

Components should have a clear responsibility.

Avoid components that simultaneously handle:

```text
UI
database
image processing
geometry
PDF generation
business validation
```

Split responsibilities into appropriate layers.

---

# 24. API Routes

API routes should be thin.

Preferred flow:

```text
Request
 ↓
Validation
 ↓
Application Use Case
 ↓
Domain
 ↓
Repository
 ↓
Response
```

Do not implement complex domain logic directly inside route handlers.

---

# 25. Validation

Differentiate:

```text
Input Validation
Domain Validation
Persistence Validation
```

Input validation verifies external data.

Domain validation verifies business invariants.

Persistence validation protects infrastructure consistency.

Do not use one layer as a replacement for another.

---

# 26. Errors

Errors must communicate meaningful failures.

Avoid:

```typescript
throw new Error("Something went wrong");
```

when the failure can be identified.

Prefer domain/application-specific errors where appropriate.

Examples:

```text
InvalidTemplateError
InvalidGeometryError
InvalidAssemblyError
AssetProcessingError
PdfGenerationError
PrintLayoutError
```

Only create an error type when it provides useful semantics.

---

# 27. Testing

Tests must verify behavior, not implementation details.

Prioritize:

```text
domain rules
geometry calculations
image-processing behavior
template validation
assembly validation
print calculations
PDF generation
repository contracts
```

Do not create tests merely to increase coverage numbers.

---

# 28. Test Naming

Test names should describe behavior.

Prefer:

```text
should calculate the printable width correctly
```

over:

```text
should call calculateWidth
```

Tests should be written in English.

---

# 29. Avoid Unnecessary Test Infrastructure

Do not create additional:

```text
factories
fixtures
mocks
helpers
test utilities
```

unless they solve a recurring problem.

Keep tests focused and easy to understand.

---

# 30. Existing Code

Before modifying existing code:

1. Read the relevant implementation.
2. Read the relevant documentation.
3. Identify existing abstractions.
4. Reuse existing patterns.
5. Determine whether the current behavior is intentional.
6. Make the smallest coherent change.

Do not rewrite entire modules unnecessarily.

---

# 31. Refactoring

Refactoring is allowed when required for correctness or architecture.

Do not perform unrelated refactors during feature work.

Avoid:

```text
renaming entire directories
rewriting unrelated components
changing libraries
introducing new architecture
```

without a concrete reason.

---

# 32. Dependencies

Do not add a dependency without determining:

```text
why it is needed
whether existing dependencies solve the problem
bundle/runtime impact
maintenance implications
```

Prefer existing project dependencies when appropriate.

---

# 33. Design Patterns

Patterns must solve real problems.

Allowed patterns include:

```text
Repository
Adapter
Strategy
Factory
Command
Value Object
Specification
Mapper
```

but only when their use improves the architecture.

Do not implement patterns for their own sake.

---

# 34. Pattern Selection

Before introducing a pattern, answer:

```text
What problem does this pattern solve?
What complexity does it remove?
What code becomes easier to change?
```

If the answer is unclear, do not introduce the pattern.

---

# 35. Agents Must Not Guess

When requirements are unclear:

```text
inspect existing code
inspect documentation
inspect related domain concepts
```

Do not invent business rules.

If implementation can safely proceed with an explicit assumption, document the assumption.

---

# 36. No Silent Decisions

Important decisions must be documented.

Examples:

```text
unit conversion strategy
template versioning
print scaling
PDF coordinate system
asset lifecycle
storage provider
image processing behavior
```

Update the relevant documentation when the architecture changes.

---

# 37. Documentation Updates

If a code change changes an architectural rule, update the corresponding document.

Examples:

```text
geometry implementation
→ geometry.md

storage implementation
→ storage.md

editor behavior
→ editor.md

PDF behavior
→ pdf.md

printing behavior
→ printing.md
```

Documentation and implementation must not intentionally diverge.

---

# 38. Change Workflow

For every non-trivial feature:

```text
1. Understand requirement
2. Read relevant documentation
3. Inspect existing code
4. Identify domain concepts
5. Identify affected layer
6. Select existing pattern if applicable
7. Implement smallest coherent solution
8. Add/update tests
9. Update documentation if necessary
10. Review architecture
11. Commit the change
```

The work is not finished until it is committed. See §54.

---

# 39. Before Creating a File

Ask:

```text
Does this concept already exist?
Can an existing file own this responsibility?
Is this file necessary?
Does its name describe a real domain/application concept?
```

Do not create files merely to make the implementation "cleaner".

---

# 40. Before Creating a Class

Ask:

```text
Does this object have state?
Does it have behavior?
Does it represent a domain concept?
Does it encapsulate an invariant?
```

If not, a function or existing abstraction may be more appropriate.

---

# 41. Before Creating a Utility

Ask:

```text
Is this operation actually generic?
Or does it belong to a specific domain concept?
```

Prefer:

```text
calculatePrintScale()
```

over:

```text
mathUtils.calculate()
```

when the behavior belongs specifically to printing.

---

# 42. Naming

Names must communicate domain intent.

Prefer:

```text
Template
TemplateVersion
Assembly
AssemblyPiece
PrintLayout
PrintPage
Asset
Export
```

Avoid ambiguous names such as:

```text
Data
Item
Object
Thing
Manager
Helper
Utils
```

---

# 43. Comments

Comments should explain:

```text
why
constraint
domain decision
non-obvious behavior
```

Do not write comments that merely repeat the code.

Bad:

```typescript
// Increment page number
pageNumber++;
```

Good:

```typescript
// Page numbering starts at 1 because PDF page indexes are user-facing.
pageNumber++;
```

---

# 44. TODOs

Do not leave vague TODOs.

Bad:

```text
TODO: fix this
```

Good:

```text
TODO: Replace temporary raster scaling with physical-unit scaling once print calibration is implemented.
```

---

# 45. Security

Never expose:

```text
database credentials
service-role credentials
private storage credentials
private tokens
```

to the client.

Authorization must be enforced server-side.

## Secrets stay out of the transcript

When inspecting `.env` or any credentials file, read the **variable names
only**, never the values.

```bash
sed -n 's/^\([A-Za-z_][A-Za-z0-9_]*\)=.*/\1/p' .env   # yes
cat .env                                              # no
```

Knowing which keys exist is enough to write the code that consumes them.
A value that enters the conversation is a value that ends up in a log,
a transcript or a summary.

If a value has to be verified, have the user verify it, or write a check the
user runs. Never print, copy or echo it.

---

# 46. User Files

Treat uploaded files as untrusted input.

Validate:

```text
file type
file size
file integrity
image dimensions
```

where applicable.

---

# 47. Performance

Do not optimize prematurely.

First establish:

```text
correctness
architecture
measurable bottleneck
```

Then optimize the actual bottleneck.

---

# 48. Large Operations

Potentially expensive operations include:

```text
image processing
PDF generation
large exports
complex geometry calculations
```

Do not block interactive UI unnecessarily.

Use asynchronous/background processing when justified by actual requirements.

---

# 49. Browser vs Server

Be explicit about execution environment.

Browser-specific operations:

```text
DOM
Canvas
File APIs
Clipboard
Pointer events
```

must not leak into server-side/domain code.

---

# 50. Final Architecture Check

Before considering a non-trivial task complete, verify:

```text
[ ] Requirement is understood
[ ] Relevant documentation was consulted
[ ] Existing code was inspected
[ ] Correct layer was selected
[ ] Domain rules are not inside UI
[ ] Infrastructure is not leaking into domain
[ ] No unnecessary abstraction was introduced
[ ] No unnecessary dependency was added
[ ] Tests cover important behavior
[ ] Documentation was updated if architecture changed
[ ] Naming follows domain terminology
[ ] Physical units are explicit
[ ] Generated artifacts are reproducible where required
```

---

# 51. Agent Behavior

The agent should behave as a senior engineer working on a long-lived product.

That means:

```text
Do not guess.
Do not over-engineer.
Do not create generic abstractions.
Do not duplicate domain logic.
Do not ignore documentation.
Do not hide architectural decisions.
Do not rewrite unrelated code.
Do not introduce dependencies without justification.
Do not treat UI state as domain state.
Do not treat pixels as physical dimensions.
Do not treat PDFs as the source of truth.
```

Instead:

```text
Understand.
Inspect.
Model.
Reuse.
Implement.
Test.
Document.
Review.
```

---

# 52. Definition of Done

A feature is not complete simply because it works visually.

It is complete when:

```text
Requirement
    +
Domain correctness
    +
Architecture compliance
    +
Tests
    +
Documentation
```

are satisfied.

---

# 53. Final Rule

When in doubt, prefer:

```text
explicit > implicit
domain-specific > generic
simple > clever
documented > assumed
composable > coupled
testable > convenient
correct > fast
```

The objective is not to generate code as quickly as possible.

The objective is to build a system that remains understandable and reliable as Piñata Maker grows.

---

# 54. Version Control

Every feature, fix, or documentation change ends in a commit.

A change that only exists in the working tree has no history: nobody can tell
what was done, when, or why, and it cannot be reverted independently.

## One commit per unit of work

Do not accumulate several features in a single commit.

```text
one feature      → one commit
one fix          → one commit
one refactor     → one commit
```

If a change touches two unrelated concerns, it is two commits.

## What a commit must contain

A commit should leave the repository in a working state:

```text
implementation
+
tests
+
documentation updated in the same commit
```

Do not commit documentation separately from the behaviour it describes when
both changed for the same reason.

## Commit messages

Use a conventional prefix and describe **what changed**, not how.

```text
feat:     new capability
fix:      corrected behaviour
refactor: structure changed, behaviour unchanged
docs:     documentation only
chore:    tooling, dependencies, configuration
test:     tests only
```

Reference the affected module when it clarifies the scope.

```text
feat(pdf-generation): render a PrintLayout as a printable document
```

The body should explain the decision when the change involved one.

## Before committing

```text
pnpm test
pnpm exec tsc --noEmit
```

Do not commit a red test suite.
