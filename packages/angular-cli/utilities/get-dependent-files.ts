import * as fs from 'fs';
import * as ts from 'typescript';
import * as glob from 'glob';
import * as path from 'path';
import * as denodeify from 'denodeify';


const readFile = <any>denodeify(fs.readFile);
const globSearch = <any>denodeify(glob);


/**
 * Interface that represents a module specifier and its position in the source file.
 * Use for storing a string literal, start position and end position of ImportClause node kinds.
 */
export interface ModuleImport {
  specifierText: string;
  pos: number;
  end: number;
}

export interface ModuleMap {
  [key: string]: ModuleImport[];
}

/**
 * Create a SourceFile as defined by Typescript Compiler API.
 * Generate a AST structure from a source file.
 *
 * @param fileName source file for which AST is to be extracted
 */
export function createTsSourceFile(fileName: string): Promise<ts.SourceFile> {
  return readFile(fileName, 'utf8')
    .then((contents: string) => {
      return ts.createSourceFile(fileName, contents, ts.ScriptTarget.Latest, true);
    });
}

/**
 * Traverses through AST of a given file of kind 'ts.SourceFile', filters out child
 * nodes of the kind 'ts.SyntaxKind.ImportDeclaration' and returns import clauses as
 * ModuleImport[]
 *
 * @param {ts.SourceFile} node: Typescript Node of whose AST is being traversed
 *
 * @return {ModuleImport[]} traverses through ts.Node and returns an array of moduleSpecifiers.
 */
export function getImportClauses(node: ts.SourceFile): ModuleImport[] {
  return node.statements
    .filter(node => node.kind === ts.SyntaxKind.ImportDeclaration)  // Only Imports.
    .map((node: ts.ImportDeclaration) => {
      let moduleSpecifier = node.moduleSpecifier;
      return {
        specifierText: moduleSpecifier.getText().slice(1, -1),
        pos: moduleSpecifier.pos,
        end: moduleSpecifier.end
      };
    });
}

/**
 * Find the file, 'index.ts' given the directory name and return boolean value
 * based on its findings.
 *
 * @param dirPath
 *
 * @return a boolean value after it searches for a barrel (index.ts by convention) in a given path
 */
export function hasIndexFile(dirPath: string): Promise<Boolean> {
  return globSearch(path.join(dirPath, 'index.ts'), { nodir: true })
    .then((indexFile: string[]) => {
      return indexFile.length > 0;
    });
}

/**
 * Function to get all the templates, stylesheets, and spec files of a given component unit
 * Assumption: When any component/service/pipe unit is generated, Angular CLI has a blueprint for
 *   creating associated files with the name of the generated unit. So, there are two
 *   assumptions made:
 *   a. the function only returns associated files that have names matching to the given unit.
 *   b. the function only looks for the associated files in the directory where the given unit
 *      exists.
 *
 * @todo read the metadata to look for the associated files of a given file.
 *
 * @param fileName
 *
 * @return absolute paths of '.html/.css/.sass/.spec.ts' files associated with the given file.
 *
 */
export function getAllAssociatedFiles(fileName: string): Promise<string[]> {
  let fileDirName = path.dirname(fileName);
  let componentName = path.basename(fileName, '.ts');
  return globSearch(path.join(fileDirName, `${componentName}.*`), { nodir: true })
    .then((files: string[]) => {
      return files.filter((file) => {
        return (path.basename(file) !== 'index.ts');
      });
    });
}

/**
 * Returns a map of all dependent file/s' path with their moduleSpecifier object
 * (specifierText, pos, end).
 *
 * @param fileName file upon which other files depend
 * @param rootPath root of the project
 *
 * @return {Promise<ModuleMap>} ModuleMap of all dependent file/s (specifierText, pos, end)
 *
 */
export function getDependentFiles(fileName: string, rootPath: string): Promise<ModuleMap> {
  return globSearch(path.join(rootPath, '**/*.ts'), { nodir: true })
    .then((files: string[]) => Promise.all(files.map(file => createTsSourceFile(file)))
    .then((tsFiles: ts.SourceFile[]) => tsFiles.map(file => getImportClauses(file)))
    .then((moduleSpecifiers: ModuleImport[][]) => {
      let allFiles: ModuleMap = {};
      files.forEach((file, index) => {
        let sourcePath = path.normalize(file);
        allFiles[sourcePath] = moduleSpecifiers[index];
      });
      return allFiles;
    })
    .then((allFiles: ModuleMap) => {
      let relevantFiles: ModuleMap = {};
      Object.keys(allFiles).forEach(filePath => {
        const tempModuleSpecifiers: ModuleImport[] = allFiles[filePath]
          .filter(importClause => {
            // Filter only relative imports
            let singleSlash = importClause.specifierText.charAt(0) === '/';
            let currentDirSyntax = importClause.specifierText.slice(0, 2) === './';
            let parentDirSyntax = importClause.specifierText.slice(0, 3) === '../';
            return singleSlash || currentDirSyntax || parentDirSyntax;
          })
          .filter(importClause => {
            let modulePath = path.resolve(path.dirname(filePath), importClause.specifierText);
            let resolvedFileName = path.resolve(fileName);
            let fileBaseName = path.basename(resolvedFileName, '.ts');
            let parsedFilePath = path.join(path.dirname(resolvedFileName), fileBaseName);
            return (parsedFilePath === modulePath) || (resolvedFileName === modulePath);
          });
        if (tempModuleSpecifiers.length > 0) {
          relevantFiles[filePath] = tempModuleSpecifiers;
        };
      });
      return relevantFiles;
    }));
}
