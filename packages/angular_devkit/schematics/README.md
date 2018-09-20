# Schematics
> A scaffolding library for the modern web.

## Description
Schematics are generators that transform an existing filesystem. It can create files, refactor existing files, or move files around.

What distinguishes Schematics from other generators, such as Yeoman or Yarn Create, is that schematics are purely descriptive; no changes are applied to the actual filesystem until everything is ready to be committed. There is no side effect, by design, in Schematics.

# Glossary

| Term | Description |
|------|-------------|
| **Schematics** | A generator that executes descriptive code without side effects on an existing file system. |
| **Collection** | A list of schematics metadata. Schematics can be referred by name inside a collection. |
| **Tool**       | The code using the Schematics library. |
| **Tree**       | A staging area for changes, containing the original file system, and a list of changes to apply to it. |
| **Rule**       | A function that applies actions to a `Tree`. It returns a new `Tree` that will contain all transformations to be applied. |
| **Source**     | A function that creates an entirely new `Tree` from an empty filesystem. For example, a file source could read files from disk and create a Create Action for each of those.
| **Action**     | An atomic operation to be validated and committed to a filesystem or a `Tree`. Actions are created by schematics. |
| **Sink**       | The final destination of all `Action`s. |

# Tooling
Schematics is a library, and does not work by itself. A [reference CLI](https://github.com/angular/angular-cli/blob/master/packages/angular_devkit/schematics_cli/bin/schematics.ts) is available on this repository, but is not published on NPM. This document explains the library usage and the tooling API, but does not go into the tool implementation itself.

The tooling is responsible for the following tasks:

1. Create the Schematic Engine, and pass in a Collection and Schematic loader.
1. Understand and respect the Schematics metadata and dependencies between collections. Schematics can refer to dependencies, and it's the responsibility of the tool to honor those dependencies. The reference CLI uses NPM packages for its collections.
1. Create the Options object. Options can be anything, but the schematics can specify a JSON Schema that should be respected. The reference CLI, for example, parses the arguments as a JSON object and validates it with the Schema specified by the collection.
  1. Schematics provides some JSON Schema formats for validation that tooling should add. These validate paths, html selectors and app names. Please check the reference CLI for how these can be added.
1. Call the schematics with the original Tree. The tree should represent the initial state of the filesystem. The reference CLI uses the current directory for this.
1. Create a Sink and commit the result of the schematics to the Sink. Many sinks are provided by the library; FileSystemSink and DryRunSink are examples.
1. Output any logs propagated by the library, including debugging information.

The tooling API is composed of the following pieces:

## Engine
The `SchematicEngine` is responsible for loading and constructing `Collection`s and `Schematics`. When creating an engine, the tooling provides an `EngineHost` interface that understands how to create a `CollectionDescription` from a name, and how to create a `SchematicDescription`.

# Schematics (Generators)
Schematics are generators and part of a `Collection`.

## Collection
A Collection is defined by a `collection.json` file (in the reference CLI). This JSON defines the following properties:

| Prop Name | Type | Description |
|---|---|---|
| **name** | `string` | The name of the collection. |
| **version** | `string` | Unused field. |

## Schematic

# Operators, Sources and Rules
A `Source` is a generator of `Tree`; it creates a root tree from nothing. A `Rule` is a transformation from one `Tree` to another. A `Schematic` (at the root) is a `Rule` that is normally applied on the filesystem.

## Operators
`FileOperator`s apply changes to a single `FileEntry` and return a new `FileEntry`. The result follows these rules:

1. If the `FileEntry` returned is null, a `DeleteAction` will be added to the action list.
1. If the path changed, a `RenameAction` will be added to the action list.
1. If the content changed, an `OverwriteAction` will be added to the action list.

It is impossible to create files using a `FileOperator`.

| FileOperator | Description |
|---|---|
| `contentTemplate<T>(options: T)` | Apply a content template (see the Template section) |
| `pathTemplate<T>(options: T)` | Apply a path template (see the Template section) |

## Provided Sources
The Schematics library provides multiple `Source` factories by default that cover basic use cases:

| Source | Description |
|---|---|
| `source(tree: Tree)` | Creates a source that returns the tree passed in argument. |
| `empty()` | Creates a source that returns an empty tree. |
| `apply(source: Source, rules: Rule[])` | Apply a list of rules to a source, and return the result. |
| `url(url: string)` | Loads a list of files from a URL and returns a Tree with the files as `CreateAction` applied to an empty `Tree` |

## Provided Rules
The schematics library also provides `Rule` factories by default:

| Rule | Description |
|---|---|
| `noop()` | Returns the input `Tree` as is. |
| `chain(rules: Rule[])` | Returns a `Rule` that's the concatenation of other rules. |
| `forEach(op: FileOperator)` | Returns a `Rule` that applies an operator to every file of the input `Tree`. |
| `move(root: string)` | Moves all the files from the input to a subdirectory. |
| `merge(other: Tree)` | Merge the input `tree` with the other `Tree`. |
| `contentTemplate<T>(options: T)` | Apply a content template (see the Template section) to the entire `Tree`. |
| `pathTemplate<T>(options: T)` | Apply a path template (see the Template section) to the entire `Tree`. |
| `template<T>(options: T)` | Apply both path and content templates (see the Template section) to the entire `Tree`. |
| `filter(predicate: FilePredicate<boolean>)` | Returns the input `Tree` with files that do not pass the `FilePredicate`. |


# Examples

## Simple
An example of a simple Schematics which creates a "hello world" file, using an option to determine its path:

```typescript
import {Tree} from '@angular-devkit/schematics';

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
