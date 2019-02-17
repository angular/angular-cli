/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { runTargetSpec } from '@angular-devkit/architect/testing';
import { join, normalize, virtualFs } from '@angular-devkit/core';
import { tap } from 'rxjs/operators';
import { browserTargetSpec, host, outputPath } from '../utils';

describe('Browser Builder allow svg', () => {

  beforeEach(done => host.initialize().toPromise().then(done, done.fail));
  afterEach(done => host.restore().toPromise().then(done, done.fail));

  it('works with aot',
    (done) => {

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

    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        const content = virtualFs.fileBufferToString(
          host.scopedSync().read(join(outputPath, 'main.js')),
        );

        expect(content).toContain('":svg:svg"');
        expect(host.scopedSync().exists(normalize('dist/app.component.svg')))
          .toBe(false, 'should not copy app.component.svg to dist');
      }),
    ).toPromise().then(done, done.fail);
  });

});
