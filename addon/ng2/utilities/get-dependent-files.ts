'use strict';

import * as fs from 'fs';
import * as ts from 'typescript';
import * as glob from 'glob';
import * as path from 'path';
import * as denodeify from 'denodeify';

import { Promise } from 'es6-promise';

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
export function createTsSourceFile(fileName: string): Promise<ts.SourceFile> {
  const readFile = denodeify(fs.readFile);
  return readFile(fileName, 'utf8')
    .then((contents: string) => {
      return ts.createSourceFile(fileName, contents, ts.ScriptTarget.ES6, true);
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
  const globSearch = denodeify(glob);
  return globSearch(path.join(dirPath, 'index.ts'), { nodir: true })
    .then((indexFile: string[]) => {
      return indexFile.length > 0;
    });
}

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
export function getDependentFiles(fileName: string, rootPath: string): Promise<ModuleMap> {
  const globSearch = denodeify(glob);
  return globSearch(path.join(rootPath, '**/*.*.ts'), { nodir: true })
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
