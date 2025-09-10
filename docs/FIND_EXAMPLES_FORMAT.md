# Angular CLI MCP Example Format Specification

This document specifies the "knowledge packet" format for all markdown examples used by the `find_examples` MCP tool. The goal of this format is to provide a rich, structured, and unambiguous source of information for an AI model, enabling it to understand, apply, and generate code based on modern Angular best practices.

The format is optimized for both keyword-based full-text search and modern semantic search via a vector database.

## File Structure

Each example must be a single `.md` file containing YAML front matter and a structured markdown body.

### 1. YAML Front Matter

The front matter provides machine-readable metadata about the example.

- **`title`** (string, required): A clear, human-readable title for the example (e.g., `Signal Form with Cross-Field Validation`).
- **`summary`** (string, required): A dense, one-sentence, factual description of what the code demonstrates. This field is the primary target for vector database embeddings.
- **`keywords`** (string[], required): A list of keywords and concepts for full-text search. Include APIs, function names, and conceptual terms (e.g., `conditional rendering`).
- **`required_packages`** (string[], optional): A list of NPM packages required for the example to work, excluding `@angular/core`. This is for dependencies that may not be installed (e.g., `@angular/forms`, `@angular/material`).
- **`related_concepts`** (string[], optional): A list of other high-level concepts that are related to this example.
- **`related_tools`** (string[], optional): A list of other MCP tools that are related to this example (e.g., `modernize`).
- **`experimental`** (boolean, optional, default: `false`): When set to `true`, indicates that the example demonstrates an experimental or unstable API that may not be suitable for production use.

### 2. Markdown Body

The body provides human-readable and AI-parsable context. It must follow this exact structure and heading order.

#### `## Purpose`

- **Content:** A high-level, conceptual explanation of the "why" behind the pattern. It should answer: "What problem does this pattern solve in an application?"

#### `## When to Use`

- **Content:** A description of the specific scenarios where this pattern is the preferred best practice. If it supersedes an older pattern, that should be mentioned here (e.g., `@if` vs. `*ngIf`).

#### `## Key Concepts`

- **Content:** A bulleted list explaining the main APIs, functions, or decorators demonstrated in the code. Each item should be in the format: `- **`functionName()`:** A brief explanation.`

#### `## Example Files`

- **Content:** This section contains the code for the example, structured as a "file-set."
- **Structure:**
      - It must start with a brief, one-sentence description of the file-set.
      - Each file within the set must be introduced with a `### filename.ext` heading.
      - Each file heading must be followed by a one-sentence description of that file's role.
      - Each file description must be followed by a fenced code block with the appropriate language identifier (e.g., `typescript`, `html`, `css`).
- **Best Practice:** Examples should be self-contained and runnable, preferably using a `standalone` component.

#### `## Usage Notes`

- **Content:** A bulleted list of important details, nuances, or rules about the _internal implementation_ of the code in the `Example Files` section.

#### `## How to Use This Example`

- **Content:** A "recipe" that explains how to consume or integrate the example into a larger application. This section is critical for code generation.
- **Structure:** It should contain one or more numbered subheadings (e.g., `### 1. Import the Component`) that provide step-by-step instructions, including code blocks.
- **Flexibility:** The content of this section should be tailored to the type of entity being demonstrated (component, service, pipe, route configuration, etc.).
- **Optional:** This section may not be needed for all examples

## Search and Embedding Strategy

This format is designed to be consumed by a sophisticated search system.

### Keyword Search (FTS)

The `keywords` field is the primary target for the full-text search engine. The content of the entire document is also indexed.

### Vector Search (Semantic Search)

For optimal RAG (Retrieval-Augmented Generation) performance, the document should be chunked before being embedded into a vector database.

- **Chunking Strategy:**
      1.  The `summary` field from the front matter should be treated as the primary, document-level chunk and receive its own embedding.
      2.  Each major markdown section (`## Purpose`, `## When to Use`, `## Key Concepts`, `## Example Files`, `## Usage Notes`, `## How to Use This Example`) should be treated as a separate chunk and receive its own embedding.
- **Metadata:** The full YAML front matter (`title`, `keywords`, `required_packages`, etc.) must be stored as metadata alongside every vector in the database. This allows for powerful post-retrieval filtering and provides the LLM with the full context after a chunk has been identified via semantic search.
