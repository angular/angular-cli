/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Path, join, normalize } from '@angular-devkit/core';
import {
  Rule,
  SchematicsException,
  chain,
  externalSchematic,
  noop,
} from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { Schema as UniversalOptions } from '@schematics/angular/universal/schema';
import { getDecoratorMetadata, getMetadataField } from '@schematics/angular/utility/ast-utils';
import { removePackageJsonDependency } from '@schematics/angular/utility/dependencies';
import { getWorkspace } from '@schematics/angular/utility/workspace';
import { Builders } from '@schematics/angular/utility/workspace-models';
import * as ts from 'typescript';

export function version9UpdateRule(collectionPath: string): Rule {
  return async host => {
    return chain([
      backupPackageScriptsRule(),
      updateProjectsStructureRule(collectionPath),
      (tree, context) => {
        const packageChanges = tree.actions.some(a => a.path.endsWith('/package.json'));
        if (context && packageChanges) {
          context.addTask(new NodePackageInstallTask());
        }
      },
    ]);
  };
}

function backupPackageScriptsRule(): Rule {
  return tree => {
    // Remove old scripts in 'package.json'
    const pkgPath = '/package.json';
    const buffer = tree.read(pkgPath);
    if (!buffer) {
      throw new SchematicsException('Could not find package.json');
    }

    const pkg = JSON.parse(buffer.toString()) as any;
    const scripts = pkg.scripts;
    if (!scripts) {
      return;
    }

    // Backup script targets
    [
      'compile:server',
      'build:ssr',
      'serve:ssr',
      'build:client-and-server-bundles',
    ].forEach(key => {
      const keyBackup = `${key}_bak`;
      const scriptValue = scripts[key];
      // Check if script target exists and it has not been already backed up
      if (scriptValue && !scripts[keyBackup]) {
        scripts[keyBackup] = scriptValue;
        scripts[key] = undefined;
      }
    });

    tree.overwrite(pkgPath, JSON.stringify(pkg, null, 2));
  };
}

function updateProjectsStructureRule(collectionPath: string): Rule {
  return async tree => {
    const workspace = await getWorkspace(tree);
    const installRules: Rule[] = [];

    for (const [projectName, projectDefinition] of workspace.projects) {
      const serverTarget = projectDefinition.targets.get('server');
      if (!serverTarget || serverTarget.builder !== Builders.Server) {
        // Only process those targets which have a known builder for the CLI
        continue;
      }

      const root = normalize(projectDefinition.root);

      // Backup old files
      [
        'server.ts',
        'webpack.server.config.js',
      ]
        .map(f => join(root, f))
        .filter(f => tree.exists(f))
        .forEach(f => tree.rename(f, `${f}.bak`));

      const installOptions: UniversalOptions = {
        clientProject: projectName,
        // Skip install, so we only do one for the entire workspace at the end.
        skipInstall: true,
      };

      // Run the install schematic again so that we re-create the entire stucture.
      installRules.push(
        removeModuleMapNgfactoryLoaderRule(normalize(projectDefinition.sourceRoot)),
        collectionPath
          ? externalSchematic(collectionPath, 'ng-add', installOptions)
          : noop(),
      );
    }

    return chain(installRules);
  };
}

function removeModuleMapNgfactoryLoaderRule(sourceRoot: Path): Rule {
  return tree => {
    const moduleMapLoaderPackageName = '@nguniversal/module-map-ngfactory-loader';

    // Strip BOM as otherwise TSC methods (Ex: getWidth) will return an offset which
    // which breaks the CLI UpdateRecorder.
    // See: https://github.com/angular/angular/pull/30719
    const createSourceFile = (path: string) => ts.createSourceFile(
      path,
      tree.read(path).toString().replace(/^\uFEFF/, ''),
      ts.ScriptTarget.Latest,
      true,
    );

    // Update main.server file
    const mainServerPath = join(sourceRoot, 'main.server.ts');
    if (tree.exists(mainServerPath)) {
      const recorder = tree.beginUpdate(mainServerPath);

      // Remove exports of '@nguniversal/module-map-ngfactory-loader'
      createSourceFile(mainServerPath)
        .statements
        .filter(s => (
          ts.isExportDeclaration(s) &&
          s.moduleSpecifier &&
          ts.isStringLiteral(s.moduleSpecifier) &&
          s.moduleSpecifier.text === moduleMapLoaderPackageName
        ))
        .forEach(node => {
          const index = node.getFullStart();
          const length = node.getFullWidth();
          recorder.remove(index, length);
        });
      tree.commitUpdate(recorder);
    }

    // Update app.server.module file
    const appServerModule = join(sourceRoot, 'app/app.server.module.ts');
    if (tree.exists(appServerModule)) {
      const recorder = tree.beginUpdate(appServerModule);
      const appServerSourceFile = createSourceFile(appServerModule);

      // Remove imports of '@nguniversal/module-map-ngfactory-loader'
      appServerSourceFile
        .statements
        .filter(s => (
          ts.isImportDeclaration(s) &&
          s.moduleSpecifier &&
          ts.isStringLiteral(s.moduleSpecifier) &&
          s.moduleSpecifier.text === moduleMapLoaderPackageName
        ))
        .forEach(node => {
          const index = node.getFullStart();
          const length = node.getFullWidth();
          recorder.remove(index, length);
        });


      // Create a TS printer to get the text
      const printer = ts.createPrinter();

      // Remove 'ModuleMapLoaderModule' from 'NgModule' imports
      getDecoratorMetadata(appServerSourceFile, 'NgModule', '@angular/core')
        .forEach((metadata: ts.ObjectLiteralExpression) => {
          const matchingProperties = getMetadataField(metadata, 'imports');

          if (!matchingProperties) {
            return;
          }

          const assignment = matchingProperties[0] as ts.PropertyAssignment;
          if (!ts.isArrayLiteralExpression(assignment.initializer)) {
            return;
          }

          const arrayLiteral = assignment.initializer;
          const newImports = arrayLiteral.elements
            .filter(n => !(ts.isIdentifier(n) && n.text === 'ModuleMapLoaderModule'));

          if (arrayLiteral.elements.length !== newImports.length) {
            const newImportsText = printer.printNode(
              ts.EmitHint.Unspecified,
              ts.updateArrayLiteral(arrayLiteral, newImports),
              appServerSourceFile,
            );

            const index = arrayLiteral.getStart();
            const length = arrayLiteral.getWidth();

            recorder
              .remove(index, length)
              .insertLeft(index, newImportsText);
          }
        });

      tree.commitUpdate(recorder);
    }

    // Remove package dependency
    removePackageJsonDependency(tree, moduleMapLoaderPackageName);
  };
}
