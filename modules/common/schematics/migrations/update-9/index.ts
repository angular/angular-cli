/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  Rule,
  SchematicsException,
  chain,
  externalSchematic,
} from '@angular-devkit/schematics';
import {getWorkspace} from '@schematics/angular/utility/workspace';
import {NodePackageInstallTask} from '@angular-devkit/schematics/tasks';
import {Builders} from '@schematics/angular/utility/workspace-models';
import {normalize, join} from '@angular-devkit/core';
import {Schema as UniversalOptions} from '@schematics/angular/universal/schema';

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

    const pkg = JSON.parse(buffer.toString());
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

      if (!collectionPath) {
        continue;
      }
      // Run the install schematic again so that we re-create the entire stucture.
      installRules.push(externalSchematic(collectionPath, 'ng-add', installOptions));
    }

    return chain(installRules);
  };
}
