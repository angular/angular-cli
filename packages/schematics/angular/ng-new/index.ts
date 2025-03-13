/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {
  Rule,
  SchematicContext,
  Tree,
  apply,
  chain,
  empty,
  mergeWith,
  move,
  noop,
  schematic,
} from '@angular-devkit/schematics';
import {
  NodePackageInstallTask,
  RepositoryInitializerTask,
} from '@angular-devkit/schematics/tasks';
import { Schema as ApplicationOptions } from '../application/schema';
import { Schema as WorkspaceOptions } from '../workspace/schema';
import { Schema as NgNewOptions } from './schema';

export default function (options: NgNewOptions): Rule {
  if (!options.directory) {
    // If scoped project (i.e. "@foo/bar"), convert directory to "foo/bar".
    options.directory = options.name.startsWith('@') ? options.name.slice(1) : options.name;
  }

  const workspaceOptions: WorkspaceOptions = {
    name: options.name,
    version: options.version,
    newProjectRoot: options.newProjectRoot,
    minimal: options.minimal,
    strict: options.strict,
    packageManager: options.packageManager,
  };
  const applicationOptions: ApplicationOptions = {
    projectRoot: '',
    name: options.name,
    inlineStyle: options.inlineStyle,
    inlineTemplate: options.inlineTemplate,
    prefix: options.prefix,
    viewEncapsulation: options.viewEncapsulation,
    routing: options.routing,
    style: options.style,
    skipTests: options.skipTests,
    skipPackageJson: false,
    // always 'skipInstall' here, so that we do it after the move
    skipInstall: true,
    strict: options.strict,
    minimal: options.minimal,
    standalone: options.standalone,
    ssr: options.ssr,
    experimentalZoneless: options.experimentalZoneless,
  };

  return chain([
    mergeWith(
      apply(empty(), [
        schematic('workspace', workspaceOptions),
        options.createApplication ? schematic('application', applicationOptions) : noop,
        move(options.directory),
      ]),
    ),
    (_host: Tree, context: SchematicContext) => {
      let packageTask;
      if (!options.skipInstall) {
        packageTask = context.addTask(
          new NodePackageInstallTask({
            workingDirectory: options.directory,
            packageManager: options.packageManager,
          }),
        );
      }
      if (!options.skipGit) {
        const commit =
          typeof options.commit == 'object' ? options.commit : options.commit ? {} : false;

        context.addTask(
          new RepositoryInitializerTask(options.directory, commit),
          packageTask ? [packageTask] : [],
        );
      }
    },
  ]);
}
