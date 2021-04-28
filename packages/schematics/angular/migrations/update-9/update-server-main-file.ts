/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Rule } from '@angular-devkit/schematics';
import * as ts from '../../third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { findNodes } from '../../utility/ast-utils';
import { allWorkspaceTargets, getWorkspace } from '../../utility/workspace';
import { Builders } from '../../utility/workspace-models';

/**
 * Update the `main.server.ts` file by adding exports to `renderModule` and `renderModuleFactory` which are
 * now required for Universal and App-Shell for Ivy and `bundleDependencies`.
 */
export function updateServerMainFile(): Rule {
  return async (tree) => {
    const workspace = await getWorkspace(tree);

    for (const [targetName, target] of allWorkspaceTargets(workspace)) {
      if (targetName !== 'server' || target.builder !== Builders.Server) {
        continue;
      }

      // find the main server file
      const mainFilePath = target.options?.main;
      if (!mainFilePath || typeof mainFilePath !== 'string') {
        continue;
      }

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
      const exportDeclarations = findNodes(
        source,
        ts.SyntaxKind.ExportDeclaration,
      ) as ts.ExportDeclaration[];

      const platformServerExports = exportDeclarations.filter(
        ({ moduleSpecifier }) =>
          moduleSpecifier &&
          ts.isStringLiteral(moduleSpecifier) &&
          moduleSpecifier.text === '@angular/platform-server',
      );

      let hasRenderModule = false;
      let hasRenderModuleFactory = false;

      // find exports of renderModule or renderModuleFactory
      for (const { exportClause } of platformServerExports) {
        if (exportClause && ts.isNamedExports(exportClause)) {
          if (!hasRenderModuleFactory) {
            hasRenderModuleFactory = exportClause.elements.some(
              ({ name }) => name.text === 'renderModuleFactory',
            );
          }

          if (!hasRenderModule) {
            hasRenderModule = exportClause.elements.some(
              ({ name }) => name.text === 'renderModule',
            );
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
        if (!exportClause || ts.isNamespaceExport(exportClause)) {
          continue;
        }

        exportSpecifiers = [...exportClause.elements];
        updateExisting = true;
      }

      if (!hasRenderModule) {
        exportSpecifiers.push(
          ts.createExportSpecifier(undefined, ts.createIdentifier('renderModule')),
        );
      }

      if (!hasRenderModuleFactory) {
        exportSpecifiers.push(
          ts.createExportSpecifier(undefined, ts.createIdentifier('renderModuleFactory')),
        );
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

        recorder.remove(start, width).insertLeft(start, newExportDeclarationText);
      } else {
        recorder.insertLeft(source.getWidth(), '\n' + newExportDeclarationText);
      }

      tree.commitUpdate(recorder);
    }
  };
}
