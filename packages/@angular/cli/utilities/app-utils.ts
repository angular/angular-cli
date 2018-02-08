const SilentError = require('silent-error');

import chalk from 'chalk';
import { CliConfig } from '../models/config';


const cache: {[name: string]: any} = {};


export function getAppFromConfig(
  maybeProjectName?: string,
  maybeTargetName?: string,
  maybeConfigName?: string
) {
  const projects: any = CliConfig.getValue('projects');
  if (!projects) {
    throw new SilentError(chalk.red('Unable to find any projects in `.angular.json`.'));
  }

  // Get project.
  const projectName = getNameOrDefault(projects, maybeProjectName);
  const project = projects[projectName];
  const targetName = getNameOrDefault(project.targets, maybeTargetName);
  const target = project.targets[targetName];
  const configName = getNameOrDefault(project.configurations, maybeConfigName);
  const config = project.configurations[configName];

  // Using empty object because most build options now have defaults.
  const cliOverrides: any = {};

  // Validate (TODO)
  const fullConfigurationName = `${projectName}/${targetName}/${configName}`;
  if (cache[fullConfigurationName]) {
    return cache[fullConfigurationName];
  }

  const finalConfig = {
    ...project,
    // Remove targets and configurations keys.
    ...{ targets: undefined, configurations: undefined },
    ...target,
    ...config,
    ...cliOverrides,
  };

  console.log(`Build configuration: ${JSON.stringify(fullConfigurationName)}`);
  console.log(JSON.stringify(finalConfig, null, 2));
  cache[fullConfigurationName] = finalConfig;

  return finalConfig;
}


function getNameOrDefault(obj: any, name?: string): any {
  for (const thingName of Object.keys(obj)) {
    const maybeThing: any = obj[thingName];
    if (thingName === name || (!name && maybeThing.default)) {
      return thingName;
    }
  }

  throw new SilentError(chalk.red(`Unable to find ${name} or default.`));
}
