const SilentError = require('silent-error');

import chalk from 'chalk';
import { CliConfig } from '../models/config';

export function getAppFromConfig(
  projectName?: string,
  targetName?: string,
  configName?: string
) {
  console.log(`projectName: ${projectName}, targetName: ${targetName}, configName: ${configName}`);

  const projects: any = CliConfig.getValue('projects');
  if (!projects) {
    throw new SilentError(chalk.red('Unable to find any projects in `.angular.json`.'));
  }

  // Get project.
  const project = getNameOrDefault(projects, projectName);
  const target = getNameOrDefault(project.targets, targetName || 'default');
  const config = getNameOrDefault(project.configurations, configName || 'default');
  // Using empty object because most build options now have defaults.
  const cliOverrides: any = {};

  const finalConfig = {
    _projectType: project._projectType,
    root: project.root,
    ...target,
    ...config,
    ...cliOverrides,
    // some aliases for the POC
    main: target.entryPoints.main,
    tsconfig: target.tsConfigPath,
  };

  // Validate (TODO)

  return finalConfig;
}


function getNameOrDefault(obj: any, name?: string): any {
  for (const thingName of Object.keys(obj)) {
    const maybeThing: any = obj[thingName];
    if (thingName === name || (!name && maybeThing.default)) {
      return maybeThing;
    }
  }

  throw new SilentError(chalk.red(`Unable to find ${name} or default.`));
}
