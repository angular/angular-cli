/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { execute } from '../../index';
import {
  BASE_OPTIONS,
  UNIT_TEST_BUILDER_INFO,
  describeBuilder,
  setupApplicationTarget,
} from '../setup';

describeBuilder(execute, UNIT_TEST_BUILDER_INFO, (harness) => {
  describe('Behavior: "Vitest coverage with tsconfig path aliases"', () => {
    beforeEach(async () => {
      setupApplicationTarget(harness);
    });

    it('should resolve tsconfig path aliases during coverage instrumentation', async () => {
      // Write a utility module that will be imported via a path alias
      await harness.writeFile(
        'src/app/util.ts',
        `export function greet(name: string): string { return \`Hello, \${name}!\`; }`,
      );

      // Add a path alias "#/util" -> "./src/app/util" to tsconfig
      await harness.modifyFile('src/tsconfig.spec.json', (content) => {
        const tsconfig = JSON.parse(content);
        tsconfig.compilerOptions ??= {};
        tsconfig.compilerOptions.paths = {
          '#/*': ['./app/*'],
        };
        return JSON.stringify(tsconfig, null, 2);
      });

      // Write an app component that imports via the alias
      await harness.writeFile(
        'src/app/app.component.ts',
        `
        import { Component } from '@angular/core';
        import { greet } from '#/util';

        @Component({
          selector: 'app-root',
          template: '<h1>{{ greeting }}</h1>',
          standalone: true,
        })
        export class AppComponent {
          greeting = greet('world');
        }
        `,
      );

      // Write a spec that exercises the component (and hence imports #/util transitively)
      await harness.writeFile(
        'src/app/app.component.spec.ts',
        `
        import { TestBed } from '@angular/core/testing';
        import { AppComponent } from './app.component';

        describe('AppComponent', () => {
          beforeEach(async () => {
            await TestBed.configureTestingModule({
              imports: [AppComponent],
            }).compileComponents();
          });

          it('should create the app', () => {
            const fixture = TestBed.createComponent(AppComponent);
            expect(fixture.componentInstance).toBeTruthy();
          });
        });
        `,
      );

      harness.useTarget('test', {
        ...BASE_OPTIONS,
        coverage: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        coverageReporters: ['json'] as any,
      });

      // Regression: this used to throw "vite:import-analysis Pre-transform error:
      // Failed to resolve import" when tsconfig paths were present and coverage was enabled.
      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      harness.expectFile('coverage/test/index.html').toExist();
    });
  });
});
