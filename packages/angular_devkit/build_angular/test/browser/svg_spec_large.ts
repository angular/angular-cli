/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Architect } from '@angular-devkit/architect';
import { join, normalize, virtualFs } from '@angular-devkit/core';
import { createArchitect, host, outputPath, veEnabled } from '../utils';

describe('Browser Builder allow svg', () => {
  const target = { project: 'app', target: 'build' };
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });
  afterEach(async () => host.restore().toPromise());

  it('works with aot', async () => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg">
        <text x="20" y="20" font-size="20" fill="red">Hello World</text>
      </svg>`;

    host.writeMultipleFiles({
      './src/app/app.component.svg': svg,
      './src/app/app.component.ts': `
        import { Component } from '@angular/core';

        @Component({
          selector: 'app-root',
          templateUrl: './app.component.svg',
          styleUrls: []
        })
        export class AppComponent {
          title = 'app';
        }
      `,
    });

    const overrides = { aot: true };

    const run = await architect.scheduleTarget(target, overrides);

    await expectAsync(run.result).toBeResolvedTo(jasmine.objectContaining({ success: true }));

    const exists = host.scopedSync().exists(join(outputPath, 'main.js'));
    expect(exists).toBe(true, '"main.js" should exist');

    if (exists) {
      const content = virtualFs.fileBufferToString(
        host.scopedSync().read(join(outputPath, 'main.js')),
      );

      if (!veEnabled) {
        expect(content).toContain('ɵɵnamespaceSVG');
      } else {
        expect(content).toContain('":svg:svg"');
      }
      expect(host.scopedSync().exists(normalize('dist/app.component.svg'))).toBe(
        false,
        'should not copy app.component.svg to dist',
      );
    }

    await run.stop();
  });
});
