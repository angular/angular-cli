/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { execute } from '../../index';
import { BASE_OPTIONS, KARMA_BUILDER_INFO, describeKarmaBuilder } from '../setup';

describeKarmaBuilder(execute, KARMA_BUILDER_INFO, (harness, setupTarget, isApplicationBuilder) => {
  describe('Option: "webWorkerTsConfig"', () => {
    beforeEach(() => {
      setupTarget(harness);
    });

    beforeEach(async () => {
      await harness.writeFiles({
        'src/tsconfig.worker.json': `
        {
          "extends": "../tsconfig.json",
          "compilerOptions": {
            "outDir": "../out-tsc/worker",
            "lib": [
              "es2018",
              "webworker"
            ],
            "types": []
          },
          "include": [
            "**/*.worker.ts",
          ]
        }`,
        'src/app/app.worker.ts': `
        /// <reference lib="webworker" />

        const prefix: string = 'Data: ';
        addEventListener('message', ({ data }) => {
          postMessage(prefix + data);
        });
      `,
        'src/app/app.component.ts': `
        import { Component } from '@angular/core';

        @Component({
          selector: 'app-root',
          template: ''
        })
        export class AppComponent {
          worker = new Worker(new URL('./app.worker', import.meta.url));
        }
        `,
        './src/app/app.component.spec.ts': `
        import { TestBed } from '@angular/core/testing';
        import { AppComponent } from './app.component';

        describe('AppComponent', () => {
          beforeEach(() => TestBed.configureTestingModule({
            declarations: [AppComponent]
          }));

          it('worker should be defined', () => {
            const fixture = TestBed.createComponent(AppComponent);
            const app = fixture.debugElement.componentInstance;
            expect(app.worker).toBeDefined();
          });
        });`,
      });
    });

    // Web workers work with the application builder _without_ setting webWorkerTsConfig.
    if (isApplicationBuilder) {
      it(`should parse web workers when "webWorkerTsConfig" is not set or set to undefined.`, async () => {
        harness.useTarget('test', {
          ...BASE_OPTIONS,
          webWorkerTsConfig: undefined,
        });

        const { result } = await harness.executeOnce();
        expect(result?.success).toBeTrue();
      });
    } else {
      it(`should not parse web workers when "webWorkerTsConfig" is not set or set to undefined.`, async () => {
        harness.useTarget('test', {
          ...BASE_OPTIONS,
          webWorkerTsConfig: undefined,
        });

        await harness.writeFile(
          './src/app/app.component.spec.ts',
          `
        import { TestBed } from '@angular/core/testing';
        import { AppComponent } from './app.component';

        describe('AppComponent', () => {
          beforeEach(() => TestBed.configureTestingModule({
            declarations: [AppComponent]
          }));

          it('worker should throw', () => {
            expect(() => TestBed.createComponent(AppComponent))
              .toThrowError(/Failed to construct 'Worker'/);
          });
        });`,
        );

        const { result } = await harness.executeOnce();
        expect(result?.success).toBeTrue();
      });
    }

    it(`should parse web workers when "webWorkerTsConfig" is set.`, async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        webWorkerTsConfig: 'src/tsconfig.worker.json',
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });
  });
});
