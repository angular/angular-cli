# Schematics

> A scaffolding library for the modern web.

## Description

Schematics are generators that transform an existing filesystem. They can create files, refactor existing files, or move files around.

What distinguishes Schematics from other generators, such as Yeoman or Yarn Create, is that schematics are purely descriptive; no changes are applied to the actual filesystem until everything is ready to be committed. There is no side effect, by design, in Schematics.

# Glossary

| Term           | Description                                                                                                                                                                                                                                                                                                                 |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Schematics** | A generator that executes descriptive code without side effects on an existing file system.                                                                                                                                                                                                                                 |
| **Collection** | A list of schematics metadata. Schematics can be referred by name inside a collection.                                                                                                                                                                                                                                      |
| **Tool**       | The code using the Schematics library.                                                                                                                                                                                                                                                                                      |
| **Tree**       | A staging area for changes, containing the original file system, and a list of changes to apply to it.                                                                                                                                                                                                                      |
| **Rule**       | A function that applies actions to a `Tree`. It returns a new `Tree` that will contain all transformations to be applied.                                                                                                                                                                                                   |
| **Source**     | A function that creates an entirely new `Tree` from an empty filesystem. For example, a file source could read files from disk and create a Create Action for each of those.                                                                                                                                                |
| **Action**     | An atomic operation to be validated and committed to a filesystem or a `Tree`. Actions are created by schematics.                                                                                                                                                                                                           |
| **Sink**       | The final destination of all `Action`s.                                                                                                                                                                                                                                                                                     |
| **Task**       | A Task is a way to execute an external command or script in a schematic. A Task can be used to perform actions such as installing dependencies, running tests, or building a project. A Task is created by using the `SchematicContext` object and can be scheduled to run before or after the schematic `Tree` is applied. |

# Tooling

Schematics is a library, and does not work by itself. A [reference CLI](https://github.com/angular/angular-cli/blob/main/packages/angular_devkit/schematics_cli/bin/schematics.ts) is available on this repository, and is published on NPM at [@angular-devkit/schematics-cli](https://www.npmjs.com/package/@angular-devkit/schematics-cli). This document explains the library usage and the tooling API, but does not go into the tool implementation itself.

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

| Prop Name   | Type     | Description                 |
| ----------- | -------- | --------------------------- |
| **name**    | `string` | The name of the collection. |
| **version** | `string` | Unused field.               |

## Schematic

# Operators, Sources and Rules

A `Source` is a generator of a `Tree`; it creates an entirely new root tree from nothing. A `Rule` is a transformation from one `Tree` to another. A `Schematic` (at the root) is a `Rule` that is normally applied on the filesystem.

## Operators

`FileOperator`s apply changes to a single `FileEntry` and return a new `FileEntry`. The result follows these rules:

1. If the `FileEntry` returned is null, a `DeleteAction` will be added to the action list.
1. If the path changed, a `RenameAction` will be added to the action list.
1. If the content changed, an `OverwriteAction` will be added to the action list.

It is impossible to create files using a `FileOperator`.

## Provided Operators

The Schematics library provides multiple `Operator` factories by default that cover basic use cases:

| FileOperator                     | Description                                                          |
| -------------------------------- | -------------------------------------------------------------------- |
| `contentTemplate<T>(options: T)` | Apply a content template (see the [Templating](#templating) section) |
| `pathTemplate<T>(options: T)`    | Apply a path template (see the [Templating](#templating) section)    |

## Provided Sources

The Schematics library additionally provides multiple `Source` factories by default:

| Source                                 | Description                                                                                                                |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `empty()`                              | Creates a source that returns an empty `Tree`.                                                                             |
| `source(tree: Tree)`                   | Creates a `Source` that returns the `Tree` passed in as argument.                                                          |
| `url(url: string)`                     | Loads a list of files from the given URL and returns a `Tree` with the files as `CreateAction` applied to an empty `Tree`. |
| `apply(source: Source, rules: Rule[])` | Apply a list of `Rule`s to a source, and return the resulting `Source`.                                                    |

## Provided Rules

The schematics library also provides `Rule` factories by default:

| Rule                                        | Description                                                                            |
| ------------------------------------------- | -------------------------------------------------------------------------------------- |
| `noop()`                                    | Returns the input `Tree` as is.                                                        |
| `chain(rules: Rule[])`                      | Returns a `Rule` that's the concatenation of other `Rule`s.                            |
| `forEach(op: FileOperator)`                 | Returns a `Rule` that applies an operator to every file of the input `Tree`.           |
| `move(root: string)`                        | Moves all the files from the input to a subdirectory.                                  |
| `merge(other: Tree)`                        | Merge the input `Tree` with the other `Tree`.                                          |
| `contentTemplate<T>(options: T)`            | Apply a content template (see the Template section) to the entire `Tree`.              |
| `pathTemplate<T>(options: T)`               | Apply a path template (see the Template section) to the entire `Tree`.                 |
| `template<T>(options: T)`                   | Apply both path and content templates (see the Template section) to the entire `Tree`. |
| `filter(predicate: FilePredicate<boolean>)` | Returns the input `Tree` with files that do not pass the `FilePredicate`.              |

# Templating

As referenced above, some functions are based upon a file templating system, which consists of path and content templating.

The system operates on placeholders defined inside files or their paths as loaded in the `Tree` and fills these in as defined in the following, using values passed into the `Rule` which applies the templating (i.e. `template<T>(options: T)`).

## Path Templating

| Placeholder             | Description                                                                                                                      |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `__variable__`          | Replaced with the value of `variable`.                                                                                           |
| `__variable@function__` | Replaced with the result of the call `function(variable)`. Can be chained to the left (`__variable@function1@function2__ ` etc). |

## Content Templating

| Placeholder         | Description                                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `<%= expression %>` | Replaced with the result of the call of the given expression. This only supports direct expressions, no structural (for/if/...) JavaScript. |
| `<%- expression %>` | Same as above, but the value of the result will be escaped for HTML when inserted (i.e. replacing '<' with '\&lt;')                         |
| `<% inline code %>` | Inserts the given code into the template structure, allowing to insert structural JavaScript.                                               |
| `<%# text %>`       | A comment, which gets entirely dropped.                                                                                                     |

# Examples

## Simple

An example of a simple Schematics which creates a "hello world" file, using an option to determine its path:

```typescript
import { Tree } from '@angular-devkit/schematics';

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

## Templating

A simplified example of a Schematics which creates a file containing a new Class, using an option to determine its name:

```typescript
// files/__name@dasherize__.ts

export class <%= classify(name) %> {
}
```

```typescript
// index.ts

import { strings } from '@angular-devkit/core';
import {
  Rule,
  SchematicContext,
  SchematicsException,
  Tree,
  apply,
  branchAndMerge,
  mergeWith,
  template,
  url,
} from '@angular-devkit/schematics';
import { Schema as ClassOptions } from './schema';

export default function (options: ClassOptions): Rule {
  return (tree: Tree, context: SchematicContext) => {
    if (!options.name) {
      throw new SchematicsException('Option (name) is required.');
    }

    const templateSource = apply(url('./files'), [
      template({
        ...strings,
        ...options,
      }),
    ]);

    return branchAndMerge(mergeWith(templateSource));
  };
}
```

Additional things from this example:

1. `strings` provides the used `dasherize` and `classify` functions, among others.
1. The files are on-disk in the same root directory as the `index.ts` and loaded into a `Tree`.
1. Then the `template` `Rule` fills in the specified templating placeholders. For this, it only knows about the variables and functions passed to it via the options-object.
1. Finally, the resulting `Tree`, containing the new file, is merged with the existing files of the project which the Schematic is run on.
