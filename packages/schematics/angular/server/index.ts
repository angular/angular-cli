/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { join, normalize } from '@angular-devkit/core';
import {
  Rule,
  SchematicsException,
  Tree,
  apply,
  applyTemplates,
  chain,
  mergeWith,
  move,
  strings,
  url,
} from '@angular-devkit/schematics';
import { posix } from 'node:path';
import { DependencyType, InstallBehavior, addDependency, addRootProvider } from '../utility';
import { getPackageJsonDependency } from '../utility/dependencies';
import { JSONFile } from '../utility/json-file';
import { latestVersions } from '../utility/latest-versions';
import { isStandaloneApp } from '../utility/ng-ast-utils';
import { targetBuildNotFoundError } from '../utility/project-targets';
import { getMainFilePath } from '../utility/standalone/util';
import { getWorkspace, updateWorkspace } from '../utility/workspace';
import { Builders } from '../utility/workspace-models';
import { Schema as ServerOptions } from './schema';

const serverMainEntryName = 'main.server.ts';

function updateConfigFileApplicationBuilder(options: ServerOptions): Rule {
  return updateWorkspace((workspace) => {
    const project = workspace.projects.get(options.project);
    if (!project) {
      return;
    }

    const buildTarget = project.targets.get('build');
    if (buildTarget?.builder !== Builders.Application) {
      throw new SchematicsException(
        `This schematic requires "${Builders.Application}" to be used as a build builder.`,
      );
    }

    buildTarget.options ??= {};
    buildTarget.options['server'] = posix.join(
      project.sourceRoot ?? posix.join(project.root, 'src'),
      serverMainEntryName,
    );
  });
}

function updateTsConfigFile(tsConfigPath: string): Rule {
  return (host: Tree) => {
    const json = new JSONFile(host, tsConfigPath);
    const filesPath = ['files'];
    const files = new Set((json.get(filesPath) as string[] | undefined) ?? []);
    files.add('src/' + serverMainEntryName);
    json.modify(filesPath, [...files]);

    const typePath = ['compilerOptions', 'types'];
    const types = new Set((json.get(typePath) as string[] | undefined) ?? []);
    types.add('node');
    json.modify(typePath, [...types]);
  };
}

function addDependencies(skipInstall: boolean | undefined): Rule {
  return (host: Tree) => {
    const coreDep = getPackageJsonDependency(host, '@angular/core');
    if (coreDep === null) {
      throw new SchematicsException('Could not find version.');
    }

    const install = skipInstall ? InstallBehavior.None : InstallBehavior.Auto;

    return chain([
      addDependency('@angular/ssr', latestVersions.AngularSSR, {
        type: DependencyType.Default,
        install,
      }),
      addDependency('@angular/platform-server', coreDep.version, {
        type: DependencyType.Default,
        install,
      }),
      addDependency('@types/node', latestVersions['@types/node'], {
        type: DependencyType.Dev,
        install,
      }),
    ]);
  };
}

export default function (options: ServerOptions): Rule {
  return async (host: Tree) => {
    const workspace = await getWorkspace(host);
    const clientProject = workspace.projects.get(options.project);
    if (clientProject?.extensions.projectType !== 'application') {
      throw new SchematicsException(`Server schematic requires a project type of "application".`);
    }

    const clientBuildTarget = clientProject.targets.get('build');
    if (!clientBuildTarget) {
      throw targetBuildNotFoundError();
    }

    if (
      clientBuildTarget?.builder !== Builders.Application &&
      clientBuildTarget?.builder !== Builders.BuildApplication
    ) {
      throw new SchematicsException(
        `Ssr schematic requires the project to use "${Builders.Application}" or "${Builders.BuildApplication}" as the build builder.`,
      );
    }

    if (clientBuildTarget.options?.server) {
      // Server has already been added.
      return;
    }

    const clientBuildOptions = clientBuildTarget.options as Record<string, string>;
    const browserEntryPoint = await getMainFilePath(host, options.project);
    const isStandalone = isStandaloneApp(host, browserEntryPoint);

    const templateSource = apply(url(isStandalone ? './files/standalone-src' : './files/src'), [
      applyTemplates({
        ...strings,
        ...options,
      }),
      move(join(normalize(clientProject.root), 'src')),
    ]);

    return chain([
      mergeWith(templateSource),
      updateConfigFileApplicationBuilder(options),
      updateTsConfigFile(clientBuildOptions.tsConfig),
      addDependencies(options.skipInstall),
      addRootProvider(
        options.project,
        ({ code, external }) =>
          code`${external('provideClientHydration', '@angular/platform-browser')}(${external(
            'withEventReplay',
            '@angular/platform-browser',
          )}())`,
      ),
    ]);
  };
}
