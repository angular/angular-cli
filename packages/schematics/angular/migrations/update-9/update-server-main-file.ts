/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Rule } from '@angular-devkit/schematics';
import * as ts from '../../third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { findNodes } from '../../utility/ast-utils';
import { findPropertyInAstObject } from '../../utility/json-utils';
import { Builders } from '../../utility/workspace-models';
import { getTargets, getWorkspace } from './utils';

/**
 * Update the `main.server.ts` file by adding exports to `renderModule` and `renderModuleFactory` which are
 * now required for Universal and App-Shell for Ivy and `bundleDependencies`.
 */
export function updateServerMainFile(): Rule {
  return tree => {
    const workspace = getWorkspace(tree);

    for (const { target } of getTargets(workspace, 'server', Builders.Server)) {
      const options = findPropertyInAstObject(target, 'options');
      if (!options || options.kind !== 'object') {
        continue;
      }

      // find the main server file
      const mainFile = findPropertyInAstObject(options, 'main');
      if (!mainFile || typeof mainFile.value !== 'string') {
        continue;
      }

      const mainFilePath = mainFile.value;

      const content = tree.read(mainFilePath);
      if (!content) {
        continue;
      }

      const source = ts.createSourceFile(
        mainFilePath,
        content.toString().replace(/^\uFEFF/, ''),
        ts.ScriptTarget.Latest,
        true,
      );

      // find exports in main server file
      const exportDeclarations = findNodes(source, ts.SyntaxKind.ExportDeclaration) as ts.ExportDeclaration[];

      const platformServerExports = exportDeclarations.filter(({ moduleSpecifier }) => (
        moduleSpecifier && ts.isStringLiteral(moduleSpecifier) && moduleSpecifier.text === '@angular/platform-server'
      ));

      let hasRenderModule = false;
      let hasRenderModuleFactory = false;

      // find exports of renderModule or renderModuleFactory
      for (const { exportClause } of platformServerExports) {
        if (exportClause && ts.isNamedExports(exportClause)) {
          if (!hasRenderModuleFactory) {
            hasRenderModuleFactory = exportClause.elements.some(({ name }) => name.text === 'renderModuleFactory');
          }

          if (!hasRenderModule) {
            hasRenderModule = exportClause.elements.some(({ name }) => name.text === 'renderModule');
          }
        }
      }

      if (hasRenderModule && hasRenderModuleFactory) {
        // We have both required exports
        continue;
      }

      let exportSpecifiers: ts.ExportSpecifier[] = [];
      let updateExisting = false;

      // Add missing exports
      if (platformServerExports.length) {
        const { exportClause } = platformServerExports[0] as ts.ExportDeclaration;
        if (!exportClause) {
          continue;
        }

        exportSpecifiers = [...exportClause.elements];
        updateExisting = true;
      }

      if (!hasRenderModule) {
        exportSpecifiers.push(ts.createExportSpecifier(
          undefined,
          ts.createIdentifier('renderModule'),
        ));
      }

      if (!hasRenderModuleFactory) {
        exportSpecifiers.push(ts.createExportSpecifier(
          undefined,
          ts.createIdentifier('renderModuleFactory'),
        ));
      }

      // Create a TS printer to get the text of the export node
      const printer = ts.createPrinter();

      const moduleSpecifier = ts.createStringLiteral('@angular/platform-server');

      // TypeScript will emit the Node with double quotes.
      // In schematics we usually write code with a single quotes
      // tslint:disable-next-line: no-any
      (moduleSpecifier as any).singleQuote = true;

      const newExportDeclarationText = printer.printNode(
        ts.EmitHint.Unspecified,
        ts.createExportDeclaration(
          undefined,
          undefined,
          ts.createNamedExports(exportSpecifiers),
          moduleSpecifier,
        ),
        source,
      );

      const recorder = tree.beginUpdate(mainFilePath);
      if (updateExisting) {
        const start = platformServerExports[0].getStart();
        const width = platformServerExports[0].getWidth();

        recorder
          .remove(start, width)
          .insertLeft(start, newExportDeclarationText);
      } else {
        recorder.insertLeft(source.getWidth(), '\n' + newExportDeclarationText);
      }

      tree.commitUpdate(recorder);
    }

    return tree;
  };
}
