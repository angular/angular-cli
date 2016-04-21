# Upgrade Process

## Abstract
The goal of this document is to design and describe a system to help users to upgrade
a project from one version of a Package (say Angular2 `2.X`) to an ulterior version of
the same package (say Angular `2.Y`, where `Y` is strictly greater than `X`), implying
refactoring the code base of said project to compile and execute properly after the
upgrade.

The upgrade must be transitive. If the process can be applied to go from version `X`
to version `X+1`, and from `X+1` to `X+2`, then the user must be able to run the same
process for going from `X` to `X+2` directly, without failure.

This is done by a series of steps, called Upgrade steps, that will be applied
incrementally to the project. These steps are free form functions; they take a source
tree and outputs a potentially different source tree, or indicates to the user what
tasks are to be performed, in case such tasks cannot be done automatically.

# Upgrade Step
An upgrade step is a relation `s` between a source `A` and the smallest ideal source
`B`, such that `s(A) ≡ B`. In this case, `A` would support compilation with Angular
`2.X`, while `B` would support compilation with Angular `2.Y`, where `X + 1 = Y`.

Put simply, a step is a function to get from one version of Angular to the next.

## Properties of Upgrade Steps
Upgrade steps must have 3 properties:

* **Atomicity** ensures that each step is "all or nothing"; if one part of the step fails, the entire step should fail, and the source is left unchanged.
* **Consistency** ensures that each step will take the source from one compilable state to another compilable state. If the state is inconsistent before the step is applied (ie. it does not compile), the step should not be applied and/or fail.
* **Durability** ensures that once a step succeeds, it is permanent and should be committed, even in the event of a power loss. This implies that the final operation should be to commit the code to a VCS.

One might figure that, adding an Isolation property, this would match the ACID principle of database transactions. Since multiple steps cannot be performed in parallel, the source is already isolated and it would be a redundant property.

Please note that because of the consistency of a step, assuming the property that code compile in one version, it is imperative that code compiles in the version after the step is applied. This leads to a strong induction with regards to the "can compile" property.

### About invertibility
Downgrading has been abandoned. Assuming the project is under some code version system, if something happen the user can look at logs or diffs to fix bugs that are impossible for us to predict. Downgrading adds an unnecessary amount of work to the implementation while providing minimal tooling for users.

## Step Definition

In the CLI, the `upgrade/steps/` directory will be kept for step scripts. It has the following structure (example):

    angular-cli/
      upgrade/
        index.ts                    <-- the Upgrade api (see below).
        steps/
          angular2/                 <-- or other npm packages.
            0001/                   <-- incrementing number.
              index.ts              <-- the script which will be executed to move up.
              XYZ.ts                <-- some utility used by a step.

The `index.ts` of the step exports the following symbols:

* `upgrade(project: AngularProject): Observable<Change>`; upgrade from the current version to the `toVersion`. Returns a stream of changes, or a failing stream on error.
* `fromVersion: SemVersion | SemVersion[]`; either a version string or an array of all version strings representing the versions this package must be before `up()` is called.
* `toVersion: SemVersion`; a version string representing the current version when `up()` succeeds.

### Rationales
An incrementing number is used instead of the from version because some versions might not be a 1-to-1 relationship between two versions. For example, version `beta-12` and `beta-13` might be both no-op, and the script upgrading to `beta-14` might have a `fromVersion` of `[beta-12, beta-13]`. Using a binary search, the lookup time is not a factor.

Using 4 digits allow us to sort the folder alphabetically while preserving order, and is more than enough; at 1 release per day this would take 27 years.


## Refactoring
Everything in a project is changeable during an upgrade; from templates, to the angular-cli config or npm packages, or TypeScript or Javascript code.

In all those cases, the input of the upgrade function is a project (which includes configuration, packages, root tree, build files, ...) and the output will be a list of changes. These changes might be applied or not, but the upgrade function should not have any side effects.

### Code
An AST-to-AST transformation step will be necessary to perform complex refactoring. The internal `upgrade` library can be used to build a transformation pipeline that will be applied to every source files in the Angular app.

The pipeline is a stream of `ts.SourceFile`, and should receive a list of changes to apply to those sources.

A transform function is a change or an array of changes. See [Change API](#change-api).

There are helpers exported to create an RxJs stream of nodes and provide changes easily:

```typescript
import {Observable} from 'rxjs/Rx';
import {runRefactor, visitNodes} from 'upgrade/api';
import {renameNode} from 'upgrade/api/changes';
import {anyOf, isClass, isFunction} from 'upgrade/api/matchers';
import * as ts from 'typescript';

function renameFunctions(source: ts.SourceFile): Observable<Change> {
  // `visitNodes` return all the nodes in the tree.
  return source.let(visitNodes)
    .filter(anyOf(isClass, isFunction))
    .flatMap((node: ts.Node): Change[] => {
      // Rename a node.
      return [renameNode(node, (<ts.Identifier>node).text + 'Upgraded')];
    });
}

export function upgrade(project): Observable<Change> {
  return runRefactor(renameFunctions);
}
```

This would apply to all classes and all functions in every source files, which might be too much. It is only shown as an example.

### <a name="change-api"></a>Change API
A change is an operation that happens on string. It is an object that implements the following interface:

```typescript
interface Change {
  // Apply the change. Fails the promise if a problem occured.
  apply(): Promise<void>;

  // The file this change should be applied to. Some changes might not apply to
  // a file (maybe the config).
  readonly path: string | null;

  // The order this change should be applied. Normally the position inside the file.
  // Changes are applied from the bottom of a file to the top.
  readonly order: number | null;

  // The description of this change. This will be outputted in a dry or verbose run.
  readonly description: string;
}
```

Some available example of a change implementation:

```typescript
// Will add text to the source code.
class AppendChange implements Change {
  constructor(file: string, pos: number, toAdd: string);
}
// Will remove text from the source code.
class RemoveChange implements Change {
  constructor(file: string, pos: number, toRemove: string);
}
// Will replace text from the source code.
class ReplaceChange implements Change {
  constructor(file: string, pos: number, oldText: string, newText: string);
}
// Will output a message for the user to fulfill.
class MessageChange implements Change {
  constructor(text: string);
}
```

Some higher function changes are provided to allow an easier way to create changes that are harder to make:

```typescript
// Rename a class to another name. Need to pass a symbol as input, as just
// a string is not enough.
declare function renameClass(project: Angular2Project,
                             from: ts.Symbol, to: string): Observable<Change>;
// Upgrade a package in NPM.
declare function upgradePackage(project: Angular2Project,
                                name: string, to: string): Observable<Change>;
// Change a configuration in angular-cli config.
declare function configSet(project: Angular2Project, key: string,
                           value: any): Observable<Change>;
// Remove a file.
declare function deleteFile(project: Angular2Project,
                            file: string): Observable<Change>;
// Scaffold a new blueprints.
declare function scaffold(project: Angular2Project, name: string,
                          arguments: {[name: string]: string}): Observable<Change>;
```

Some higher level changes examples:

```typescript
// Add a new Import if the import isn't already in the file.
class AddImportChange implements Change {
  constructor(file: string, symbolName: string, importPath: string);
}
```

# Upgrade Command
A new command must be added to the CLI;

    ng upgrade [options]
    Upgrade the project to a newer version.

    Options:
      --package=<name>  The package to upgrade. By default, upgrade every packages
                        that are outdated.
      --to=<semver>     Move to a specific version of Angular. Only valid with
                        --package and --dry-run.
                        Default: latest.
      --from=<semver>   Specify the version the project is currently using. Only
                        valid with --package and --dry-run.
                        Default: the installed version is used.
      --commit=<bool>   Whether the tool should automatically create a commit.
                        Default: false.
      --message=<msg>   The commit message to use. Only valid with --commit.
      --dry-run         Only output the commands and refactor steps that would be run,
                        but do nothing.
                        Default: false.

## Process
The command will execute the following tasks in order:

1. If the `angular-cli` is not the latest version, return with an error message suggesting an upgrade. This step is necessary even if the version is supported as a upgrade, because updates to the upgrade steps might have occurred.
1. If the project is in a git repository, verify that there are no differences between the current ref and the latest origin/master. If differences exist (or status is not clean), exit early.
1. If `--package` is passed:
    1. Check that that package is installed.
    1. If `--from` is passed, check that `--dry-run` is passed too.
    1. If `--to` is passed, check that `--dry-run` is passed too.
1. Otherwise, list all packages that need updating.
1. Get the from version of current packages, get their sequential number.
1. Get the to version of current packages, get their sequential number.
1. If either the from version or to version couldn't be found, returns an error message and exit.
1. Call `upgrade()` for each upgrade step for each packages. If a step returns false or throws, let the user know which package, which version and which part failed and exit.
1. If the `--commit` flag is present, commit the current repository with a default message or the message passed in.

