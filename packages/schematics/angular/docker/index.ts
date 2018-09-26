/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  Rule,
  SchematicContext,
  SchematicsException,
  Tree,
  apply,
  chain,
  mergeWith,
  move,
  template,
  url,
} from '@angular-devkit/schematics';
import { getWorkspace } from '../utility/config';
import { NodeScript, addPackageJsonScript } from '../utility/dependencies';
import { getProjectTargets } from '../utility/project-targets';
import { WorkspaceTool } from './../../../angular_devkit/core/src/workspace/workspace-schema';
import { Schema as DockerOptions } from './schema';

// tslint:disable-next-line:max-line-length
const applyDockerOptions = (projectTargets: WorkspaceTool, dockerOptions: DockerOptions, environmentOptions: { machineName: string | undefined, isImageDeploy: boolean, serviceName: string | undefined }) => {
  if (!projectTargets || !dockerOptions || !environmentOptions || !dockerOptions.environment) {
    return;
  }

  if (projectTargets.build
    && projectTargets.build.configurations
    && projectTargets.build.configurations.docker) {
    const dockerConfiguration = projectTargets.build.configurations.docker;
    dockerConfiguration.environments[dockerOptions.environment] = environmentOptions;

    return dockerConfiguration;
  }

  return {
    imageName: dockerOptions.imageName,
    registryAddress: dockerOptions.imageRegistry,
    environments: {
      [dockerOptions.environment]: environmentOptions,
    },
  };

};

function updateConfigFile(options: DockerOptions): Rule {
  return (host: Tree, context: SchematicContext) => {
    context.logger.debug('updating config file.');

    const environmentOptions = {
      machineName: options.machineName,
      isImageDeploy: false,
      serviceName: options.serviceName,
    };

    const workspace = getWorkspace(host);

    if (!options.project) {
      throw new SchematicsException('Option (project) is required.');
    }

    const projectTargets = getProjectTargets(workspace, options.project);

    const target = projectTargets.build;

    if (!target || !target.configurations) {
      throw Error('Build configurations are missing!');
    }

    const applyTo = target.configurations;

    if (!options.machineName || !options.serviceName) {
        throw new SchematicsException('Option (machineName) and (serviceName) are required.');
    }

    applyTo.docker = applyDockerOptions(projectTargets, options, environmentOptions);

    return host;
  };
}

function addDockerScript(): Rule {
  return (host: Tree, context: SchematicContext) => {

    const dockerScript: NodeScript = {
      name: 'docker',
      value: 'docker-compose up -d --build',
    };

    return addPackageJsonScript(host, dockerScript);
  };
}

export default function (options: DockerOptions): Rule {
  return (host: Tree) => {
    const workspace = getWorkspace(host);

    if (!options.project) {
      throw new SchematicsException('Option (project) is required.');
    }

    const project = workspace.projects[options.project];

    if (project.projectType !== 'application') {
      throw new SchematicsException(`Docker requires a project type of "application".`);
    }

    const templateSource = apply(url('./files'), [
      template({...options}),
      move(project.root),
    ]);

    return chain([
      mergeWith(templateSource),
      updateConfigFile(options),
      addDockerScript(),
    ]);
  };
}
