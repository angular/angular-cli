/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {experimental, strings} from '@angular-devkit/core';
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
import {BrowserBuilderOptions} from '@schematics/angular/utility/workspace-models';
import {
  addPackageJsonDependency,
  NodeDependencyType,
} from '@schematics/angular/utility/dependencies';

// TODO(CaerusKaru): make these configurable
const BROWSER_DIST = 'dist/browser';
const SERVER_DIST = 'dist/server';

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
    addPackageJsonDependency(host, {
      type: NodeDependencyType.Default,
      name: '@nguniversal/hapi-engine',
      version: '0.0.0-PLACEHOLDER',
    });
    addPackageJsonDependency(host, {
      type: NodeDependencyType.Default,
      name: '@nguniversal/module-map-ngfactory-loader',
      version: '0.0.0-PLACEHOLDER',
    });
    addPackageJsonDependency(host, {
      type: NodeDependencyType.Default,
      name: 'hapi',
      version: 'HAPI_VERSION',
    });
    addPackageJsonDependency(host, {
      type: NodeDependencyType.Default,
      name: 'inert',
      version: '^5.1.0',
    });

    if (options.webpack) {
      addPackageJsonDependency(host, {
        type: NodeDependencyType.Dev,
        name: 'ts-loader',
        version: '^5.2.0',
      });
      addPackageJsonDependency(host, {
        type: NodeDependencyType.Dev,
        name: 'webpack-cli',
        version: '^3.1.0',
      });
    }

    const serverFileName = options.serverFileName.replace('.ts', '');
    const pkgPath = '/package.json';
    const buffer = host.read(pkgPath);
    if (buffer === null) {
      throw new SchematicsException('Could not find package.json');
    }

    const pkg = JSON.parse(buffer.toString());

    pkg.scripts['compile:server'] = options.webpack ?
      'webpack --config webpack.server.config.js --progress --colors' :
      `tsc -p ${serverFileName}.tsconfig.json`;
    pkg.scripts['serve:ssr'] = `node dist/${serverFileName}`;
    pkg.scripts['build:ssr'] = 'npm run build:client-and-server-bundles && npm run compile:server';
    pkg.scripts['build:client-and-server-bundles'] =
      `ng build --prod && ng run ${options.clientProject}:server:production`;

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

    // We have to check if the project config has a server target, because
    // if the Universal step in this schematic isn't run, it can't be guaranteed
    // to exist
    if (!clientProject.architect.server) {
      return;
    }

    clientProject.architect.server.configurations = {
      production: {
        fileReplacements: [
          {
            replace: 'src/environments/environment.ts',
            with: 'src/environments/environment.prod.ts'
          }
        ]
      }
    };
    // TODO(CaerusKaru): make this configurable
    clientProject.architect.server.options.outputPath = SERVER_DIST;
    // TODO(CaerusKaru): make this configurable
    (clientProject.architect.build.options as BrowserBuilderOptions).outputPath = BROWSER_DIST;

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
      options.webpack ?
        filter(path => !path.includes('tsconfig')) : filter(path => !path.startsWith('webpack')),
      template({
        ...strings,
        ...options as object,
        stripTsExtension: (s: string) => s.replace(/\.ts$/, ''),
        getBrowserDistDirectory: () => BROWSER_DIST,
        getServerDistDirectory: () => SERVER_DIST,
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
