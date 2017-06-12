# Schematics
> A scaffolding library for the modern web.

## Description
Schematics are generators that transform an existing filesystem. It can create files, refactor existing files, or move files around.

What distinguish Schematics from other generators, such as Yeoman or Yarn Create, is that schematics are purely descriptive; no changes are applied to the actual filesystem until everything is ready to be committed. There is no side effect, by design, in Schematics.

# Glossary

| Term | Description |
|------|-------------|
| **Schematics** | A generator that execute descriptive code without side effects on an existing file system. |
| **Collection** | A list of schematics metadata. Schematics can be referred by name inside a collection. |
| **Tool**       | The code using the Schematics library. |
| **Tree**       | A staging area for changes, containing the original file system, and a list of changes to apply to it. |
| **Rule**       | A function that applies actions to a `Tree`. It returns a new Tree that will contain all transformations to be applied. |
| **Source**     | A function that creates an entirely new `Tree` from an empty filesystem. For example, a file source could read files from disk and create a Create Action for each of those.
| **Action**     | A atomic operation to be validated and committed to a filesystem or a `Tree`. Actions are created by schematics. |
| **Sink**       | The final destination of all `Action`s. |

# Tooling
Schematics is a library, and does not work by itself. A reference CLI is available in [`@angular/schematics-cli`](../schematics_cli/README.md). This document explain the library usage and the tooling API, but does not go into the tool implementation itself.

The tooling is responsible for the following tasks:

1. Create the Schematic Engine, and pass in a Collection and Schematic loader.
1. Understand and respect the Schematics metadata and dependencies between collections. Schematics can refer to dependencies, and it's the responsibility of the tool to honor those dependencies. The reference CLI uses NPM packages for its collections.
1. Create the Options object. Options can be anything, but the schematics can specify a JSON Schema that should be respected. The reference CLI, for example, parse the arguments as a JSON object and validate it with the Schema specified by the collection.
1. Call the schematics with the original Tree. The tree should represent the initial state of the filesystem. The reference CLI uses the current directory for this.
1. Create a Sink and commit the result of the schematics to the Sink. Many sinks are provided by the library; FileSystemSink and DryRunSink are examples.
1. Output any logs propagated by the library, including debugging information.

The tooling API is composed of the following pieces:

## Engine
The `SchematicEngine` is responsible for loading and constructing `Collection`s and `Schematics`'. When creating an engine, the tooling provides an `EngineHost` interface that understands how to create a `CollectionDescription` from a name, and how to create a `Schematic

# Examples

## Simple
An example of a simple Schematics which creates a "hello world" file, using an option to determine its path:

```typescript
import {Tree} from '@angular/schematics';

export default function MySchematic(options: any) {
  return (tree: Tree) => {
    tree.create(options.path + '/hi', 'Hello world!');
    return tree;
  };
}
```

A few things from this example:

1. The function receives the list of options from the tooling.
1. It returns a [`Rule`](src/engine/interface.ts#L73), which is a transformation from a `Tree` to another `Tree`.



# Future Work

Schematics is not done yet. Here's a list of things we are considering:

* Smart defaults for Options. Having a JavaScript function for default values based on other default values.
* Prompt for input options. This should only be prompted for the original schematics, dependencies to other schematics should not trigger another prompting.
* Tasks for running tooling-specific jobs before and after a schematics has been scaffolded. Such tasks can involve initialize git, or npm install. A specific list of tasks should be provided by the tool, with unsupported tasks generating an error. 

