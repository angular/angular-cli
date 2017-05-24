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
1. Create the Options object. Options can be anything, but the schematics can specify a JSON Schema that should be respected. The reference CLI, for example, parses the arguments as a JSON object and validate it with the Schema specified by the collection.
1. Call the schematics with the original Tree. The tree should represent the initial state of the filesystem. The reference CLI uses the current directory for this.
1. Create a Sink and commit the result of the schematics to the Sink. Many sinks are provided by the library; FileSystemSink and DryRunSink are examples.
1. Output any logs propagated by the library, including debugging information.

The tooling API is composed of the following pieces:

## EngineHost
The `SchematicEngine` is responsible for loading and constructing `Collection`s and `Schematics`'. When creating an engine, the tooling provides an `EngineHost` interface that understands how to create a `CollectionDescription` from a name, how to create a `SchematicDescription` from a `CollectionDescription` and a name, as well as how to create the `Rule` factory for that Schematics. Both of which are information necessary for the `Engine` to work properly.

All Description interfaces are generics that take interfaces as type parameters. Those interfaces can be used by the tooling to store additional information in the `CollectionDescription` and the `SchematicDescription`. The descriptions returned by the host are guaranteed to be the same objects when passing them as input.

### CollectionDescription
A `CollectionDescription` is the minimum amount of information that `Engine` needs to create a collection. It is currently only a `name`, which is used to validate the collection and cache it.

### SchematicDescription
A `SchematicDescription` is the minimum amount of information that `Engine` needs to create a schematic. It is currently a `name` (which is used to be cached), and a `CollectionDescription`. The collection description is asserted to be the same description as passed in. It is used later on to reference collections when schematics are created by name only.

### Source from URL
It is possible for schematics to create `Source`s from a URL. These are useful when we want to load a list of template files. There are 3 default URL protocols supported by the Engine:

- `null:` returns a Tree that's invalid and will throw exceptions.
- `empty:` returns a Tree that's empty.
- `host:` returns a copy of the host passed to this schematic, from the context.

### RuleFactory
The other method necessary to resolve a schematics is the `RuleFactory`, a function that takes an option argument and returns a `Rule`. That factory is created from both descriptions by the host and the result will be called by the Engine when necessary. Please note that the engine cache this `RuleFactory` based on both descriptions, so if a schematic is created twice the `getSchematicRuleFactory` host function will only be called once.

### Default MergeStrategy
The `EngineHost` can have an optional `defaultMergeStrategy` to specify how the tooling wants to set the default `MergeStrategy`. This will be used if schematics don't specify a merge strategy on their own.

## EngineHost Implementations

### NodeModulesEngineHost
The Schematics library provides an EngineHost that understands NPM node modules, using node modules to define collections and schematics. 

This engine host use the following conventions:

1. A node package needs to define a `schematics` key in its `package.json`, which points to a JSON file that contains collection metadata. This metadata is of the follpwing type:

    ```typescript
    interface NodeModuleCollectionJson {
      name: string;
      version?: string;
      description: string;
      schematics: {
        [name: string]: {
          factory: string;
          description: string;
          schema?: string;
        }
      };
    }
    ```

    The name must be the same name as the NPM package.
1. The `schematics` dictionary is used to resolve schematics information.
    - The `factory` is a string of the form `modulePath#ExportName`. It is resolved relative to the collection JSON file, and the `ExportName` will be `default` if not specified.
    - The `schema` is a string that points to a JSON Schema file (relative to the collection JSON file).
    - The `description` field is a description that can be used by the tooling to show to the user.
1. The `RuleFactory` is loaded from the `factory` field above by using `require()`. The `SchematicDescription` contains the name and more information necessary for the Host to resolve more.
1. This EngineHost also registers some URLs:
    - `file:` (or not specifying a protocol) supports loading a file system from the disk.

# Schematics
A schematics is defined by the `RuleFactory` and its `SchematicDescription`, which contains the name and collection.

## Tree
By definition, a schematic is a transformation between a `Tree` and another `Tree`. It receives a host `Tree`, and applies a list of actions to it, potentially returning it at the end.

## Action
A tree is transformed by staging actions, which can write over a file, create new files, rename or delete existing files.

## Branching
A tree can be branched, keeping its history, then adding actions on top of it. Two trees that are being merged will ignore their common history.

## Merging
Merging two trees results in a tree containing all actions. If two actions apply on the same path, it is automatically considered a conflict and needs to be resolved.

### Conflicts
Merge conflicts are resolved using the chosen `MergeStrategy` (with the default set by the tooling):

1. `MergeStrategy.Error`. Throw an exception and stops creating the schematic.
1. `MergeStrategy.Overwrite`. The action from the last merge argument is preferred.
1. `MergeStrategy.ContentOnly`. Creation or Renaming the same file will throw an exception, but overwriting its content will resolve as if `MergeStrategy.Overwrite` is chosen.

## Optimize
Optimizing a tree results in the tree with a smaller staging; actions that overrules each other within the same tree are removed or simplified. The history of the tree is NOT preserved, but only the staged actions are changed.

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

## Templated Source
An example of a simple Schematics which reads a directory and apply templates to its content and path.

```typescript
import {apply, mergeWith, template, url} from '@angular/schematics';

export default function(options: any) {
  return mergeWith([
    apply(url('./files'), [
      template({ utils: stringUtils, ...options })
    ])
  ]);
};
```


# Future Work

Schematics is not done yet. Here's a list of things we are considering:

* Smart defaults for Options. Having a JavaScript function for default values based on other default values.
* Prompt for input options. This should only be prompted for the original schematics, dependencies to other schematics should not trigger another prompting.
* Tasks for running tooling-specific jobs before and after a schematics has been scaffolded. Such tasks can involve initialize git, or npm install. A specific list of tasks should be provided by the tool, with unsupported tasks generating an error. 
* Better URL support for more consistency. Right now tools define their own URLs without having consistency between two tools, which means that there is still some cohesion between the schematic and the tool.
* Annotation support. Annotations are being designed right now, but they will be a type-safe way to attach metadata to a file that is updated if the file changes content. Such Annotation could tell if a file is, e.g., a test file, or binary, or the annotation could be the TypeScript AST of the file itself.
