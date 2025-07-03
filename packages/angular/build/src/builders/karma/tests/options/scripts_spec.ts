/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { execute } from '../../index';
import { BASE_OPTIONS, KARMA_BUILDER_INFO, describeKarmaBuilder } from '../setup';

describeKarmaBuilder(execute, KARMA_BUILDER_INFO, (harness, setupTarget) => {
  describe('Option: "scripts"', () => {
    beforeEach(async () => {
      await setupTarget(harness);
    });

    it(`should be able to access non injected script`, async () => {
      await harness.writeFiles({
        'src/test.js': `console.log('hello from test script.')`,
        'src/app/app.component.ts': `
          import { Component } from '@angular/core';

          @Component({
            selector: 'app-root',
            standalone: false,
            template: '<p>Hello World</p>'
          })
          export class AppComponent {
            loadScript() {
              return new Promise<void>((resolve, reject) => {
                const script = document.createElement('script');
                script.onload = () => resolve();
                script.onerror  = reject;
                script.src = 'test.js';
                document.body.appendChild(script);
              });
            }
          }
         `,
        'src/app/app.component.spec.ts': `
          import { TestBed } from '@angular/core/testing';
          import { AppComponent } from './app.component';

          describe('AppComponent', () => {
            beforeEach(() => TestBed.configureTestingModule({
              declarations: [AppComponent]
            }));

            it('should load script', async () => {
              const fixture = TestBed.createComponent(AppComponent);
              fixture.detectChanges();

              await expectAsync(fixture.componentInstance.loadScript()).toBeResolved();
            });
          });`,
      });

      harness.useTarget('test', {
        ...BASE_OPTIONS,
        scripts: [
          {
            input: 'src/test.js',
            bundleName: 'test',
            inject: false,
          },
        ],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });
  });
});
