/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect } from '@angular-devkit/architect';
import { TestLogger } from '@angular-devkit/architect/testing';
import { browserBuild, createArchitect, host, veEnabled } from '../utils';

describe('Browser Builder no entry module', () => {
  const target = { project: 'app', target: 'build' };
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });
  afterEach(async () => host.restore().toPromise());

  it('works', async () => {
    // Remove the bootstrap but keep a reference to AppModule so the import is not elided.
    host.replaceInFile('src/main.ts', /platformBrowserDynamic.*?bootstrapModule.*?;/, '');
    host.appendToFile('src/main.ts', 'console.log(AppModule);');

    await browserBuild(architect, host, target, { baseHref: '/myUrl' });
  });

  it('reports warning when no bootstrap code', async () => {
    if (!veEnabled) {
      pending('Does not apply to Ivy.');

      return;
    }

    host.replaceInFile('src/main.ts', /./g, '');
    host.appendToFile('src/main.ts', `import './app/app.module';`);

    const logger = new TestLogger('no-bootstrap');
    await browserBuild(architect, host, target, { baseHref: '/myUrl' }, { logger });
    expect(logger.includes('Lazy routes discovery is not enabled')).toBe(true);
  });
});
