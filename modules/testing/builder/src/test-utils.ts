/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/* eslint-disable import/no-extraneous-dependencies */

import { Architect, BuilderOutput, ScheduleOptions, Target } from '@angular-devkit/architect';
import { WorkspaceNodeModulesArchitectHost } from '@angular-devkit/architect/node';
import { TestProjectHost, TestingArchitectHost } from '@angular-devkit/architect/testing';
import {
  Path,
  getSystemPath,
  join,
  json,
  normalize,
  schema,
  virtualFs,
  workspaces,
} from '@angular-devkit/core';
import path from 'node:path';
import { firstValueFrom } from 'rxjs';

// Default timeout for large specs is 60s.
jasmine.DEFAULT_TIMEOUT_INTERVAL = 60_000;

export const workspaceRoot = join(normalize(__dirname), `../projects/hello-world-app/`);
export const host = new TestProjectHost(workspaceRoot);
export const outputPath: Path = normalize('dist');

export const browserTargetSpec = { project: 'app', target: 'build' };
export const devServerTargetSpec = { project: 'app', target: 'serve' };
export const extractI18nTargetSpec = { project: 'app', target: 'extract-i18n' };
export const karmaTargetSpec = { project: 'app', target: 'test' };
export const tslintTargetSpec = { project: 'app', target: 'lint' };
export const protractorTargetSpec = { project: 'app-e2e', target: 'e2e' };

export async function createArchitect(workspaceRoot: Path) {
  const registry = new schema.CoreSchemaRegistry();
  registry.addPostTransform(schema.transforms.addUndefinedDefaults);
  const workspaceSysPath = getSystemPath(workspaceRoot);

  // The download path is relative (set from Starlark), so before potentially
  // changing directories, or executing inside a temporary directory, ensure
  // the path is absolute.
  if (process.env['PUPPETEER_DOWNLOAD_PATH']) {
    process.env.PUPPETEER_DOWNLOAD_PATH = path.resolve(process.env['PUPPETEER_DOWNLOAD_PATH']);
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
  const architect = new Architect(architectHost, registry);

  return {
    workspace,
    architectHost,
    architect,
  };
}

export interface BrowserBuildOutput {
  output: BuilderOutput;
  files: { [file: string]: Promise<string> };
}

export async function browserBuild(
  architect: Architect,
  host: virtualFs.Host,
  target: Target,
  overrides?: json.JsonObject,
  scheduleOptions?: ScheduleOptions,
): Promise<BrowserBuildOutput> {
  const run = await architect.scheduleTarget(target, overrides, scheduleOptions);
  const output = (await run.result) as BuilderOutput & { outputs: { path: string }[] };
  expect(output.success).toBe(true);

  if (!output.success) {
    await run.stop();

    return {
      output,
      files: {},
    };
  }

  const [{ path }] = output.outputs;
  expect(path).toBeTruthy();
  const outputPath = normalize(path);

  const fileNames = await firstValueFrom(host.list(outputPath));
  const files = fileNames.reduce((acc: { [name: string]: Promise<string> }, path) => {
    let cache: Promise<string> | null = null;
    Object.defineProperty(acc, path, {
      enumerable: true,
      get() {
        if (cache) {
          return cache;
        }
        if (!fileNames.includes(path)) {
          return Promise.reject('No file named ' + path);
        }
        cache = firstValueFrom(host.read(join(outputPath, path))).then((content) =>
          virtualFs.fileBufferToString(content),
        );

        return cache;
      },
    });

    return acc;
  }, {});

  await run.stop();

  return {
    output,
    files,
  };
}

export const lazyModuleFiles: { [path: string]: string } = {
  'src/app/lazy/lazy-routing.module.ts': `
    import { NgModule } from '@angular/core';
    import { Routes, RouterModule } from '@angular/router';

    const routes: Routes = [];

    @NgModule({
      imports: [RouterModule.forChild(routes)],
      exports: [RouterModule]
    })
    export class LazyRoutingModule { }
  `,
  'src/app/lazy/lazy.module.ts': `
    import { NgModule } from '@angular/core';
    import { CommonModule } from '@angular/common';

    import { LazyRoutingModule } from './lazy-routing.module';

    @NgModule({
      imports: [
        CommonModule,
        LazyRoutingModule
      ],
      declarations: []
    })
    export class LazyModule { }
  `,
};

export const lazyModuleFnImport: { [path: string]: string } = {
  'src/app/app.module.ts': `
    import { BrowserModule } from '@angular/platform-browser';
    import { NgModule } from '@angular/core';

    import { AppComponent } from './app.component';
    import { RouterModule } from '@angular/router';

    @NgModule({
      declarations: [
        AppComponent
      ],
      imports: [
        BrowserModule,
        RouterModule.forRoot([
          { path: 'lazy', loadChildren: () => import('./lazy/lazy.module').then(m => m.LazyModule) }
        ])
      ],
      providers: [],
      bootstrap: [AppComponent]
    })
    export class AppModule { }
`,
};
