/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

// import { Architect } from '@angular-devkit/architect';
// import { join, normalize } from '@angular-devkit/core';
// import { concatMap, tap, toArray } from 'rxjs/operators';
// import { host, browserTargetSpec, makeWorkspace } from '../utils';
// import { lazyModuleFiles, lazyModuleImport } from './rebuild_spec_large';


// TODO: re-enable this test when the custom lazy module changes have been ported over to
// webpack-builder from the CLI.
// describe('Browser Builder custom lazy modules', () => {
//
//   const architect = new Architect(normalize(workspaceRoot), host);
//   const outputPath = normalize('dist');

//   beforeEach(done => host.initialize().subscribe(undefined, done.fail, done));
//   afterEach(done => host.restore().subscribe(undefined, done.fail, done));

//   it('works', (done) => {
//     host.writeMultipleFiles(lazyModuleFiles);
//     host.writeMultipleFiles(lazyModuleImport);
//     host.writeMultipleFiles({
//       'src/app/app.component.ts': `
//         import { Component, SystemJsNgModuleLoader } from '@angular/core';

//         @Component({
//           selector: 'app-root',
//           templateUrl: './app.component.html',
//           styleUrls: ['./app.component.css'],
//         })
//         export class AppComponent {
//           title = 'app';
//           constructor(loader: SystemJsNgModuleLoader) {
//             // Module will be split at build time and loaded when requested below
//             loader.load('app/lazy/lazy.module#LazyModule')
//               .then((factory) => { /* Use factory here */ });
//           }
//         }`,
//     });

//     const overrides = { lazyModules: ['app/lazy/lazy.module'] };

//     architect.loadWorkspaceFromJson(makeWorkspace(browserTargetSpec)).pipe(
//       concatMap(() => architect.run(architect.getTarget({ overrides }))),
//       tap((buildEvent) => expect(buildEvent.success).toBe(true)),
//       tap(() =>
//         expect(host.scopedSync().exists(join(outputPath, 'lazy.module.js'))).toBe(true)),
//     ).subscribe(undefined, done.fail, done);
//   }, 30000);
// });
