/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { JsonObject, workspaces } from '@angular-devkit/core';
import { AngularWorkspace } from '../utilities/config';
import { getMissingProjectMessage } from './schematics-command-module';

describe('getMissingProjectMessage', () => {
  const projectOption = { type: 'string', $default: { $source: 'projectName' } };
  const schemaJson: JsonObject = {
    type: 'object',
    properties: { name: { type: 'string' }, project: projectOption },
    required: ['name', 'project'],
  };

  function createWorkspace(...projectNames: string[]): AngularWorkspace {
    const projects = new workspaces.ProjectDefinitionCollection();
    for (const name of projectNames) {
      projects.add({ name, root: `projects/${name}` });
    }

    return new AngularWorkspace({ extensions: {}, projects }, '/angular.json');
  }

  it('should list the available projects when the project cannot be determined', () => {
    expect(getMissingProjectMessage(createWorkspace('second', 'first'), schemaJson, {})).toBe(
      'Cannot determine project for command.\n' +
        'This is a multi-project workspace and the current working directory is not inside a ' +
        'single project. Use the "--project" option to specify a project or change the current ' +
        'working directory to a project directory.\n\n' +
        'Available projects are:\n- first\n- second',
    );
  });

  it('should explain how to create a project when the workspace has none', () => {
    expect(getMissingProjectMessage(createWorkspace(), schemaJson, {})).toBe(
      'Cannot determine project for command.\n' +
        'This workspace does not contain any projects. ' +
        'Run "ng generate application" or "ng generate library" to create one.',
    );
  });

  it('should use the name of the option that relies on the smart default', () => {
    const message = getMissingProjectMessage(
      createWorkspace('first', 'second'),
      { properties: { targetProject: projectOption }, required: ['targetProject'] },
      {},
    );

    expect(message).toContain('Use the "--target-project" option');
  });

  it('should not return a message when the option has a value', () => {
    expect(
      getMissingProjectMessage(createWorkspace('first', 'second'), schemaJson, {
        project: 'first',
      }),
    ).toBeUndefined();
  });

  it('should not return a message when the option is not required', () => {
    expect(
      getMissingProjectMessage(
        createWorkspace('first', 'second'),
        { ...schemaJson, required: ['name'] },
        {},
      ),
    ).toBeUndefined();
  });

  it('should not return a message when the option does not use the smart default', () => {
    expect(
      getMissingProjectMessage(
        createWorkspace('first', 'second'),
        { ...schemaJson, properties: { project: { type: 'string' } } },
        {},
      ),
    ).toBeUndefined();
  });

  it('should not return a message when the option can be prompted for', () => {
    expect(
      getMissingProjectMessage(
        createWorkspace('first', 'second'),
        {
          ...schemaJson,
          properties: { project: { ...projectOption, 'x-prompt': 'Which project?' } },
        },
        {},
      ),
    ).toBeUndefined();
  });
});
