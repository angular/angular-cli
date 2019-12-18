/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect } from '@angular-devkit/architect';
import { WorkspaceNodeModulesArchitectHost } from '@angular-devkit/architect/node';
import { TestingArchitectHost, TestProjectHost } from '@angular-devkit/architect/testing';
import {
  Path,
  getSystemPath,
  normalize,
  schema,
  workspaces,
} from '@angular-devkit/core';
import { mkdirSync, symlinkSync, existsSync } from 'fs';
import * as path from 'path';
import { cp } from 'shelljs';

// Add link from src -> tmp hello-world-app
const templateRoot = path.join(
  process.env.TEST_TMPDIR!,
  `hello-world-app-${Math.random().toString(36).slice(2)}`,
);

const testingAppSrc = path.dirname(require.resolve(
  `nguniversal/modules/builders/testing/hello-world-app/package.json`,
));

cp(
  '-ru',
  testingAppSrc,
  templateRoot,
);

// link node packages
symlinkSync(
  path.join(require.resolve('npm/node_modules/@angular/core/package.json'), '../../../'),
  path.join(process.env.TEST_TMPDIR!, 'node_modules'),
  'junction'
);

export const workspaceRoot = normalize(templateRoot);
export const host = new TestProjectHost(workspaceRoot);
export const outputPathBrowser = normalize('dist/app/browser');
export const outputPathServer = normalize('dist/app/server');

export async function createArchitect(root: Path) {
  const workspaceSysPath = getSystemPath(root);

  // link @nguniversal packages
  const nodeModuleDir = path.join(workspaceSysPath, 'node_modules');
  if (!existsSync(nodeModuleDir)) {
    mkdirSync(nodeModuleDir);
  }
  const ngUniversalNodePackages = path.join(nodeModuleDir, '@nguniversal');
  if (!existsSync(ngUniversalNodePackages)) {
    mkdirSync(ngUniversalNodePackages);
  }

  const ngUniversalExpressNodePackages = path.join(ngUniversalNodePackages, 'express-engine');
  if (!existsSync(ngUniversalExpressNodePackages)) {
    cp(
      '-ru',
      path.join(
        require.resolve('nguniversal/modules/express-engine/npm_package/package.json'), '../'),
      ngUniversalExpressNodePackages,
    );
  }

  const { workspace } = await workspaces.readWorkspace(
    workspaceSysPath,
    workspaces.createWorkspaceHost(host),
  );
  const architectHost = new TestingArchitectHost(
    workspaceSysPath,
    workspaceSysPath,
    new WorkspaceNodeModulesArchitectHost(workspace, workspaceSysPath),
  );

  const registry = new schema.CoreSchemaRegistry();
  registry.addPostTransform(schema.transforms.addUndefinedDefaults);
  const architect = new Architect(architectHost, registry);

  return {
    workspace,
    architectHost,
    architect,
  };
}
