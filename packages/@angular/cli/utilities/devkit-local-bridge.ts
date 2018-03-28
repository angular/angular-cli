import { findUp } from './find-up';
import { dirname } from 'path';
import { homedir } from 'os';
import { requireProjectModule } from './require-project-module';

// @angular-devkit/local bridge.
// This file allows the CLI to use workspace versions of devkit packages when in a workspace.

import * as cliDevkitArchitect from '@angular-devkit/architect';
import * as cliDevkitCore from '@angular-devkit/core';
import * as cliDevkitCoreNode from '@angular-devkit/core/node';
import * as cliDevkitSchematics from '@angular-devkit/schematics';
import * as cliDevkitSchematicsTesting from '@angular-devkit/schematics/testing';

// Declare the types of exports to keep type information inside Angular CLI, but
// export them dynamically via `module.exports`.
// Types must be imported separately in the CLI, since they are not values and thus not re-exported.
// TODO: is there a way of re-exporting the types here as well?

declare let architect: typeof cliDevkitArchitect;
declare let core: typeof cliDevkitCore;
declare let coreNode: typeof cliDevkitCoreNode;
declare let schematics: typeof cliDevkitSchematics;
declare let schematicsTesting: typeof cliDevkitSchematicsTesting;
export { architect, schematics, core, coreNode, schematicsTesting };

const workspacePath = getAngularCliWorkspaceRoot();

if (workspacePath) {
  try {
    const devkitLocal = requireProjectModule(workspacePath, '@angular-devkit/local');
    module.exports = {
      architect: devkitLocal.architect,
      core: devkitLocal.core,
      coreNode: devkitLocal.coreNode,
      schematics: devkitLocal.schematics,
      schematicsTesting: devkitLocal.schematicsTesting,
    };
  } catch (error) {
    if (error && error.message.includes(`Cannot find module '@angular-devkit/local'`)) {
      // TODO: consider if this should be a warning instead, that can be disabled via config.
      // If it is a warning, then the local CLI can be wholly removed.
      // This in turn allows the running the CLI from global only and removing default builders.
      console.error(`
        You are using Angular CLI locally without a corresponding '@angular-devkit/local' install.
        This usage is not currently supported.

        Please install '@angular-devkit/local' with the same version as '@angular/cli'.
      `);
      process.exit(3);
    } else {
      throw error;
    }
  }
} else {
  module.exports = {
    architect: cliDevkitArchitect,
    core: cliDevkitCore,
    coreNode: cliDevkitCoreNode,
    schematics: cliDevkitSchematics,
    schematicsTesting: cliDevkitSchematicsTesting,
  };
}

// This function is a toned down version of WorkspaceLoader._getProjectWorkspaceFilePath.
// We can't use WorkspaceLoader (or its static methods/properties) because it needs the bridge.
function getAngularCliWorkspaceRoot(): string | null {
  // Find closest angular.json
  const workspaceFilenames = ['.angular.json', 'angular.json'];

  const workspaceFilePath = findUp(workspaceFilenames, process.cwd())
    || findUp(workspaceFilenames, __dirname);

  // No workspace file means no workspace.
  // Global workspace file also means this isn't a workspace.
  if (!workspaceFilePath || dirname(workspaceFilePath) === homedir()) {
    return null;
  }

  return dirname(workspaceFilePath);
}
