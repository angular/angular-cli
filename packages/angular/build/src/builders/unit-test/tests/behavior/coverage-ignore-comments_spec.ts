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
  describe('Behavior: "coverage ignore comments"', () => {
    beforeEach(async () => {
      setupApplicationTarget(harness, { extractLicenses: false, optimization: false });
    });

    function getSpecContent(extraTest = '') {
      return `
import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AppComponent],
    });
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('hello');
  });

  ${extraTest}
});
`;
    }

    async function assertNoUncoveredStatements(contextMessage: string) {
      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      harness.expectFile('coverage/test/coverage-final.json').toExist();

      const coverageMap = JSON.parse(harness.readFile('coverage/test/coverage-final.json'));
      const appComponentPath = Object.keys(coverageMap).find((p) => p.includes('app.component.ts'));
      expect(appComponentPath).toBeDefined();

      const appComponentCoverage = coverageMap[appComponentPath as string];

      const statementCounts = Object.values(appComponentCoverage.s);
      const hasUncoveredStatements = statementCounts.some((count) => count === 0);
      expect(hasUncoveredStatements).withContext(contextMessage).toBeFalse();
    }

    for (const type of ['istanbul', 'v8']) {
      it(`should respect ${type} ignore next comments when computing coverage`, async () => {
        harness.useTarget('test', {
          ...BASE_OPTIONS,
          coverage: true,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          coverageReporters: ['json'] as any,
        });

        await harness.writeFile(
          'src/app/app.component.ts',
          `
          import { Component } from '@angular/core';

          @Component({
            selector: 'app-root',
            template: '<h1>hello</h1>',
            standalone: true,
          })
          export class AppComponent {
            title = 'app';

            /* ${type} ignore next */
            untestedFunction() {
              return false;
            }
          }
          `,
        );

        await harness.writeFile('src/app/app.component.spec.ts', getSpecContent());

        await assertNoUncoveredStatements(
          'There should be no uncovered statements as the uncalled function was ignored',
        );
      });

      it(`should respect ${type} ignore if comments when computing coverage`, async () => {
        harness.useTarget('test', {
          ...BASE_OPTIONS,
          coverage: true,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          coverageReporters: ['json'] as any,
        });

        await harness.writeFile(
          'src/app/app.component.ts',
          `
          import { Component } from '@angular/core';

          @Component({
            selector: 'app-root',
            template: '<h1>hello</h1>',
            standalone: true,
          })
          export class AppComponent {
            checkValue(val: boolean) {
              /* ${type} ignore if -- @preserve */
              if (val) {
                return true;
              }
              return false;
            }
          }
          `,
        );

        await harness.writeFile(
          'src/app/app.component.spec.ts',
          getSpecContent(`
    it('should exercise the function but not the if block', () => {
      const fixture = TestBed.createComponent(AppComponent);
      const app = fixture.componentInstance;
      app.checkValue(false);
    });
  `),
        );

        await assertNoUncoveredStatements(
          'There should be no uncovered statements as the uncalled branch was ignored',
        );
      });

      it(`should respect ${type} ignore else comments when computing coverage`, async () => {
        harness.useTarget('test', {
          ...BASE_OPTIONS,
          coverage: true,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          coverageReporters: ['json'] as any,
        });

        await harness.writeFile(
          'src/app/app.component.ts',
          `
          import { Component } from '@angular/core';

          @Component({
            selector: 'app-root',
            template: '<h1>hello</h1>',
            standalone: true,
          })
          export class AppComponent {
            checkValue(val: boolean) {
              /* ${type} ignore else -- @preserve */
              if (val) {
                return true;
              } else {
                return false;
              }
            }
          }
          `,
        );

        await harness.writeFile(
          'src/app/app.component.spec.ts',
          getSpecContent(`
    it('should exercise the function but not the else block', () => {
      const fixture = TestBed.createComponent(AppComponent);
      const app = fixture.componentInstance;
      app.checkValue(true);
    });
  `),
        );

        await assertNoUncoveredStatements(
          'There should be no uncovered statements as the uncalled else branch was ignored',
        );
      });
    }

    it('should respect v8 ignore start/stop comments when computing coverage', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        coverage: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        coverageReporters: ['json'] as any,
      });

      await harness.writeFile(
        'src/app/app.component.ts',
        `
        import { Component } from '@angular/core';

        @Component({
          selector: 'app-root',
          template: '<h1>hello</h1>',
          standalone: true,
        })
        export class AppComponent {
          title = 'app';

          /* v8 ignore start */
          untestedFunction() {
            return false;
          }
          /* v8 ignore stop */
        }
        `,
      );

      await harness.writeFile('src/app/app.component.spec.ts', getSpecContent());

      await assertNoUncoveredStatements(
        'There should be no uncovered statements as the uncalled function was ignored',
      );
    });
  });
});
