/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { Rule, SchematicContext, SchematicsException, Tree } from '@angular-devkit/schematics';
import { ProjectDefinition, WorkspaceDefinition, getWorkspace } from './workspace';

/**
 * Creates a schematic rule factory that provides project information to the given factory function.
 * The project is determined from the `project` option. If the project is not found, an exception is
 * thrown.
 *
 * @param factory The factory function that creates the schematic rule.
 * @returns A schematic rule factory.
 */
export function createProjectSchematic<S extends { project: string }>(
  factory: (
    options: S,
    projectContext: {
      project: ProjectDefinition;
      workspace: WorkspaceDefinition;
      tree: Tree;
      context: SchematicContext;
    },
  ) => Rule | Promise<Rule>,
): (options: S) => Rule {
  return (options) => async (tree, context) => {
    const workspace = await getWorkspace(tree);
    const project = workspace.projects.get(options.project);

    if (!project) {
      throw new SchematicsException(`Project "${options.project}" does not exist.`);
    }

    return factory(options, { project, workspace, tree, context });
  };
}
