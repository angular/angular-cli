/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {experimental, JsonObject, strings} from '@angular-devkit/core';
import {
  Rule,
  SchematicContext,
  SchematicsException,
  Tree,
  apply,
  chain,
  mergeWith,
  template,
  url,
  noop,
  filter,
  externalSchematic,
} from '@angular-devkit/schematics';
import {NodePackageInstallTask} from '@angular-devkit/schematics/tasks';
import {getWorkspace, getWorkspacePath} from '@schematics/angular/utility/config';
import {Schema as UniversalOptions} from './schema';


function getClientProject(
  host: Tree, options: UniversalOptions,
): experimental.workspace.WorkspaceProject {
  const workspace = getWorkspace(host);
  const clientProject = workspace.projects[options.clientProject];
  if (!clientProject) {
    throw new SchematicsException(`Client app ${options.clientProject} not found.`);
  }

  return clientProject;
}

function addDependenciesAndScripts(options: UniversalOptions): Rule {
  return (host: Tree) => {

    const pkgPath = '/package.json';
    const buffer = host.read(pkgPath);
    if (buffer === null) {
      throw new SchematicsException('Could not find package.json');
    }

    const pkg = JSON.parse(buffer.toString());

    pkg.dependencies['@nguniversal/express-engine'] = '0.0.0-PLACEHOLDER';
    pkg.dependencies['@nguniversal/module-map-ngfactory-loader'] = '0.0.0-PLACEHOLDER';
    pkg.dependencies['express'] = 'EXPRESS_VERSION';

    pkg.scripts['serve:ssr'] = 'node dist/server';
    pkg.scripts['build:ssr'] = 'npm run build:client-and-server-bundles && npm run compile:server';
    pkg.scripts['build:client-and-server-bundles'] =
      `ng build --prod && ng run ${options.clientProject}:server:production`;
    pkg.scripts['compile:server'] =
      `tsc -p ${options.serverFileName.replace(/\.ts$/, '')}.tsconfig.json`;

    host.overwrite(pkgPath, JSON.stringify(pkg, null, 2));

    return host;
  };
}

function updateConfigFile(options: UniversalOptions): Rule {
  return (host: Tree) => {
    const workspace = getWorkspace(host);
    if (!workspace.projects[options.clientProject]) {
      throw new SchematicsException(`Client app ${options.clientProject} not found.`);
    }

    const clientProject = workspace.projects[options.clientProject];
    if (!clientProject.architect) {
      throw new Error('Client project architect not found.');
    }

    const serverConfig: JsonObject = {
      production: {
        fileReplacements: [
          {
            replace: 'src/environments/environment.ts',
            with: 'src/environments/environment.prod.ts'
          }
        ]
      }
    };

    // We have to check if the project config has a server target, because
    // if the Universal step in this schematic isn't run, it can't be guaranteed
    // to exist
    if (!clientProject.architect.server) {
      return;
    }

    clientProject.architect.server.configurations = serverConfig;

    const workspacePath = getWorkspacePath(host);

    host.overwrite(workspacePath, JSON.stringify(workspace, null, 2));

    return host;
  };
}

export default function (options: UniversalOptions): Rule {
  return (host: Tree, context: SchematicContext) => {
    const clientProject = getClientProject(host, options);
    if (clientProject.projectType !== 'application') {
      throw new SchematicsException(`Universal requires a project type of "application".`);
    }

    if (!options.skipInstall) {
      context.addTask(new NodePackageInstallTask());
    }

    const rootSource = apply(url('./files/root'), [
      options.skipServer ? filter(path => !path.startsWith('__serverFileName')) : noop(),
      template({
        ...strings,
        ...options as object,
        stripTsExtension: (s: string) => { return s.replace(/\.ts$/, ''); }
      })
    ]);

    return chain([
      options.skipUniversal ?
        noop() : externalSchematic('@schematics/angular', 'universal', options),
      updateConfigFile(options),
      mergeWith(rootSource),
      addDependenciesAndScripts(options),
    ]);
  };
}
