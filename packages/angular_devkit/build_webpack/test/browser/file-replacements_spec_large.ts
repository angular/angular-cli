/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

// import { Architect } from '@angular-devkit/architect';
// import { join, normalize, virtualFs } from '@angular-devkit/core';
// import { concatMap, tap } from 'rxjs/operators';
// import { host, browserTargetSpec, makeWorkspace } from '../utils';


// TODO: re-enable this test when the functionality is implemented, wether by option or via VFS.
// describe('Browser Builder file replacements', () => {
//
//   const architect = new Architect(normalize(workspaceRoot), host);
//   const outputPath = normalize('dist');

//   beforeEach(done => host.initialize().subscribe(undefined, done.fail, done));
//   afterEach(done => host.restore().subscribe(undefined, done.fail, done));

//   it('works', (done) => {
//     const overrides = {
//       fileReplacements: [
//         { from: 'src/environments/environment.ts', to: 'src/environments/environment.prod.ts' },
//       ],
//     };

//     architect.loadWorkspaceFromJson(makeWorkspace(browserTargetSpec)).pipe(
//       concatMap(() => architect.run(architect.getTarget({ overrides }))),
//       tap(() => {
//         const fileName = join(outputPath, 'main.js');
//         const content = virtualFs.fileBufferToString(host.scopedSync().read(fileName));
//         expect(content).toContain('production: true');
//       }),
//     ).subscribe(undefined, done.fail, done);
//   }, 30000);

//   it(`fails with missing 'from' file`, (done) => {
//     const overrides = {
//       fileReplacements: [
//         {
//           from: 'src/environments/environment.potato.ts',
//           to: 'src/environments/environment.prod.ts',
//         },
//       ],
//     };

//     architect.loadWorkspaceFromJson(makeWorkspace(browserTargetSpec)).pipe(
//       concatMap(() => architect.run(architect.getTarget({ overrides }))),
//       tap((buildEvent) => expect(buildEvent.success).toBe(false)),
//     ).subscribe(undefined, done.fail, done);
//   }, 30000);

//   it(`fails with missing 'to' file`, (done) => {
//     const overrides = {
//       fileReplacements: [
//         {
//           from: 'src/environments/environment.ts',
//           to: 'src/environments/environment.potato.ts',
//         },
//       ],
//     };

//     architect.loadWorkspaceFromJson(makeWorkspace(browserTargetSpec)).pipe(
//       concatMap(() => architect.run(architect.getTarget({ overrides }))),
//       tap((buildEvent) => expect(buildEvent.success).toBe(false)),
//     ).subscribe(undefined, done.fail, done);
//   }, 30000);
// });

// TODO: Also add a karma test like the one below.
// export default function () {
//   // Tests run in 'dev' environment by default.
//   return writeFile('src/app/environment.spec.ts', `
//       import { environment } from '../environments/environment';

//       describe('Test environment', () => {
//         it('should have production disabled', () => {
//           expect(environment.production).toBe(false);
//         });
//       });
//     `)
//     .then(() => ng('test', '--single-run'))

//     // Tests can run in different environment.
//     .then(() => writeFile('src/app/environment.spec.ts', `
//       import { environment } from '../environments/environment';

//       describe('Test environment', () => {
//         it('should have production enabled', () => {
//           expect(environment.production).toBe(true);
//         });
//       });
//     `))
//     .then(() => ng('test', '-e', 'prod', '--single-run'));
// }
