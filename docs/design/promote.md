Component Promotion
===================

Abstract
-----------
One of the main features of the Angular CLI is to create a nested structure of components for the organization of an Angular application. Occasionally, components in one particular level of the application structure tree can be useful in other parts of the application, and hence components tend to be moved (by Developers) along the structure tree. Currently, when such cases arise, the developers have to manually look for the component’s relative imports and other component units’ dependencies on that moved component, and resolve those imports to reflect the change in the location.  

Why is it important to Angular?
----------------------------------------------
The goal of Angular CLI is to help facilitate the Angular developers to organize and develop Angular projects efficiently. With the implementation of ‘promote’ command in the CLI, the workflow will be more automated as the command will further aid the CLI to reduce the errors caused by typos generated from manual fixes of relative imports to reflect the promotion process of a given component unit. 


Promote Process (Detailed Design)
----------------------------------------------

### Assumptions and Implementation

1. The command works **only inside the project** created by [angular-cli](https://github.com/angular/angular-cli).
    * The root directory of the project is assumed to be `angular-cli-project/src/app`.
2. In order to prevent cluttered code-flow in the command source file, the implemenation for command consists of using 
    utility functions and a class implemented separately.
    * `get-dependent-files.ts`: 
      Given a file name, the function parses every Typescript files under the root directory into AST Typescript source file
      as defined by Typescript Language Service API. Then, function iteratively filters out relative imports from each file
      to determine which file is importing the given file.

      The file composes of exported utility functions:
    ```
    /**
    * Interface that represents a module specifier and its position in the source file.
    * Use for storing a string literal, start position and end posittion of ImportClause node kinds.
    */
    export interface ModuleImport {
    specifierText: string;
    pos: number;
    end: number;
    };

    export interface ModuleMap {
    [key: string]: ModuleImport[];
    }

    /**
    * Create a SourceFile as defined by Typescript Compiler API.
    * Generate a AST structure from a source file.
    * 
    * @param fileName source file for which AST is to be extracted
    */
    export function createTsSourceFile(fileName: string): Promise<ts.SourceFile> {}

    /**
    * Traverses through AST of a given file of kind 'ts.SourceFile', filters out child
    * nodes of the kind 'ts.SyntaxKind.ImportDeclaration' and returns import clauses as 
    * ModuleImport[]
    * 
    * @param {ts.SourceFile} node: Typescript Node of whose AST is being traversed
    * 
    * @return {ModuleImport[]} traverses through ts.Node and returns an array of moduleSpecifiers.
    */
    export function getImportClauses(node: ts.SourceFile): ModuleImport[] {}

    /** 
    * Find the file, 'index.ts' given the directory name and return boolean value
    * based on its findings.
    * 
    * @param dirPath
    * 
    * @return a boolean value after it searches for a barrel (index.ts by convention) in a given path
    */
    export function hasIndexFile(dirPath: string): Promise<Boolean> {}

    /**
    * Returns a map of all dependent file/s' path with their moduleSpecifier object
    * (specifierText, pos, end)
    * 
    * @param fileName file upon which other files depend 
    * @param rootPath root of the project
    * 
    * @return {Promise<ModuleMap>} ModuleMap of all dependent file/s (specifierText, pos, end)
    * 
    */
    export function getDependentFiles(fileName: string, rootPath: string): Promise<ModuleMap> {}
    ```
    * `Change` API: Then Change Interface provides a way to insert/remove/replace string in a given file.
    The implementation of Change API is provided [here](https://github.com/hansl/angular-cli/blob/7ea3e78ff3d899d5277aac5dfeeece4056d0efe3/docs/design/upgrade.md#change-api).

    * `class ModuleResolver`
    ```
    class ModuleResolver {
      
      constructor(public oldFilePath: string, public newFilePath: string, public rootPath: string) {}
    
    /**
      * Changes are applied from the bottom of a file to the top.
      * An array of Change instances are sorted based upon the order, 
      * then apply() method is called sequentially.
      * 
      * @param changes {Change []} 
      * @return Promise after all apply() method of Change class is called 
      *         to all Change instances sequentially.
      */
      applySortedChangePromise(changes: Change[]): Promise<void> {}

      /** 
      * Assesses the import specifier and determines if it is a relative import.
      * 
      * @return {boolean} boolean value if the import specifier is a relative import.
      */
      isRelativeImport(importClause: dependentFilesUtils.ModuleImport): boolean {}
      
      /** 
      * Rewrites the import specifiers of all the dependent files (cases for no index file).
      * 
      * @todo Implement the logic for rewriting imports of the dependent files when the file
      *       being moved has index file in its old path and/or in its new path.
      * 
      * @return {Promise<Change[]>} 
      */
      resolveDependentFiles(): Promise<Change[]> {}

      /**
      * Rewrites the file's own relative imports after it has been moved to new path.
      * 
      * @return {Promise<Change[]>}
      */
      resolveOwnImports(): Promise<Change[]> {}
    }
    ```
3. The implementation adopts asynchronous operations in every applicable scenarios so that the process of 
   `promote` command does not block other processes. Promises used in the implemenation are adopted from ES6 Promise.

### Components of `Promote` command

The project constituents a new ‘ng’ command system. The command will look as follows:
* ng promote `oldPath` `newPath`
* The command only takes two arguments:
  * oldPath: the path to the file being promoted.
  * newPath: the path to the directory where the file is being promoted.
* The command has no other options available besides `--help`.
* The command should only execute inside an Angular project created by angular-cli.

Validation
---------------

Validation is required for the two arguments in the promote command. It is an important part of the process.
* Validation executes in three parts which are done in order:

  1. The two arguments of the command (`oldPath` and `newPath`) should always be passed.
  2. Validation in `oldPath`
      * The file should exist inside the project.
      * The file should be a TypeScript file.
      * The owner should have read/write permission of the file.
  3. Validation in `newPath`
      * The argument should be a directory.
      * The directory must exist. (the command doesn’t create a new directory)
      * The directory must not contain file with same name as `oldPath`.
      * The owner should have read/write/execute permission of the directory.
* Validation is done in the `BeforeRun:` if any of the validation throws an error, whole promote process is stopped.

Process (Steps)
----------------
The promote command is extended from `Ember CLI`'s [`Command`](https://github.com/ember-cli/ember-cli/blob/master/lib/models/command.js) 
object.
The command will execute in two attribute methods of `Command` Object.

* `beforeRun`: 
  1. Validation process is executed. If any of the validation steps fails, then whole process is stopped with an `Error`.
* `run`: 
  1. Parse the provided arguments to get the absolute path.
  2. Create a new instance of class ModuleResolver
  3. Store all the changes for rewriting the imports of all dependent files in memory.
  4. Store all the changes for rewriting the imports of the moved file itself in memory.
  5. Apply all the changes.
  6. Move the file and its associated files to new path.

