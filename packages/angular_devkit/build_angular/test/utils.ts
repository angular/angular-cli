/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
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
import { BrowserBuilderOutput } from '../src/browser';

export const veEnabled = process.argv.includes('--ve');

const devkitRoot = normalize((global as any)._DevKitRoot); // tslint:disable-line:no-any
export const workspaceRoot = join(
  devkitRoot,
  `tests/angular_devkit/build_angular/hello-world-app${veEnabled ? '-ve' : ''}/`,
);
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

export async function browserBuild(
  architect: Architect,
  host: virtualFs.Host,
  target: Target,
  overrides?: json.JsonObject,
  scheduleOptions?: ScheduleOptions,
): Promise<{ output: BuilderOutput; files: { [file: string]: Promise<string> } }> {
  const run = await architect.scheduleTarget(target, overrides, scheduleOptions);
  const output = (await run.result) as BrowserBuilderOutput;
  expect(output.success).toBe(true);

  expect(output.outputPath).not.toBeUndefined();
  const outputPath = normalize(output.outputPath);

  const fileNames = await host.list(outputPath).toPromise();
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

        cache = host
          .read(join(outputPath, path))
          .toPromise()
          .then(content => virtualFs.fileBufferToString(content));

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

export const lazyModuleStringImport: { [path: string]: string } = {
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
          { path: 'lazy', loadChildren: './lazy/lazy.module#LazyModule' }
        ])
      ],
      providers: [],
      bootstrap: [AppComponent]
    })
    export class AppModule { }
  `,
};

export const lazyModuleFnImport: { [path: string]: string } = {
  'src/app/app.module.ts': lazyModuleStringImport['src/app/app.module.ts'].replace(
    `loadChildren: './lazy/lazy.module#LazyModule'`,
    `loadChildren: () => import('./lazy/lazy.module').then(m => m.LazyModule)`,
  ),
};
