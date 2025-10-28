/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { workspaces } from '@angular-devkit/core';
import { ArchitectCommandModule } from '../../command-builder/architect-command-module';
import { CommandModuleImplementation } from '../../command-builder/command-module';
import { RootCommands } from '../command-config';

export default class ServeCommandModule
  extends ArchitectCommandModule
  implements CommandModuleImplementation
{
  multiTarget = false;
  command = 'serve [project]';
  aliases = RootCommands['serve'].aliases;
  describe = 'Builds and serves your application, rebuilding on file changes.';
  longDescriptionPath?: string | undefined;

  override async findDefaultBuilderName(
    project: workspaces.ProjectDefinition,
  ): Promise<string | undefined> {
    // Only application type projects have a dev server target
    if (project.extensions['projectType'] !== 'application') {
      return;
    }

    const buildTarget = project.targets.get('build');
    if (!buildTarget) {
      // No default if there is no build target
      return;
    }

    // Provide a default based on the defined builder for the 'build' target
    switch (buildTarget.builder) {
      case '@angular-devkit/build-angular:application':
      case '@angular-devkit/build-angular:browser-esbuild':
      case '@angular-devkit/build-angular:browser':
        return '@angular-devkit/build-angular:dev-server';
      case '@angular/build:application':
        return '@angular/build:dev-server';
    }

    // For other builders, attempt to resolve a 'dev-server' builder from the 'build' target package name
    const [buildPackageName] = buildTarget.builder.split(':', 1);
    if (buildPackageName) {
      try {
        const qualifiedBuilderName = `${buildPackageName}:dev-server`;
        await this.getArchitectHost().resolveBuilder(qualifiedBuilderName);

        // Use builder if it resolves successfully
        return qualifiedBuilderName;
      } catch {}
    }
  }
}
