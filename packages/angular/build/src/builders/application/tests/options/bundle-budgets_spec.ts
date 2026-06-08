/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { buildApplication } from '../../index';
import { Type } from '../../schema';
import {
  APPLICATION_BUILDER_INFO,
  BASE_OPTIONS,
  describeBuilder,
  expectLog,
  expectNoLog,
  lazyModuleFiles,
  lazyModuleFnImport,
} from '../setup';

describeBuilder(buildApplication, APPLICATION_BUILDER_INFO, (harness) => {
  const CSS_EXTENSIONS = ['css', 'scss', 'less'];
  const BUDGET_NOT_MET_REGEXP = /Budget .+ was not met by/;

  describe('Option: "bundleBudgets"', () => {
    it(`should not warn when size is below threshold`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        optimization: true,
        budgets: [{ type: Type.All, maximumWarning: '100mb' }],
      });

      const { result, logs } = await harness.executeOnce();
      expect(result?.success).toBe(true);
      expectNoLog(logs, BUDGET_NOT_MET_REGEXP);
    });

    it(`should error when size is above 'maximumError' threshold`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        optimization: true,
        budgets: [{ type: Type.All, maximumError: '100b' }],
      });

      const { result, logs } = await harness.executeOnce();
      expect(result?.success).toBeFalse();
      expectLog(logs, BUDGET_NOT_MET_REGEXP);
    });

    it(`should warn when size is above 'maximumWarning' threshold`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        optimization: true,
        budgets: [{ type: Type.All, maximumWarning: '100b' }],
      });

      const { result, logs } = await harness.executeOnce();
      expect(result?.success).toBe(true);
      expectLog(logs, BUDGET_NOT_MET_REGEXP);
    });

    it(`should warn when lazy bundle is above 'maximumWarning' threshold`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        optimization: true,
        budgets: [{ type: Type.Bundle, name: 'lazy-module', maximumWarning: '100b' }],
      });

      await harness.writeFiles(lazyModuleFiles);
      await harness.writeFiles(lazyModuleFnImport);

      const { result, logs } = await harness.executeOnce();
      expect(result?.success).toBe(true);
      expectLog(logs, 'lazy-module exceeded maximum budget');
    });

    it(`should not warn when non-injected style is not within the baseline threshold`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        optimization: false,
        styles: [
          {
            input: 'src/lazy-styles.css',
            inject: false,
            bundleName: 'lazy-styles',
          },
        ],
        budgets: [
          { type: Type.Bundle, name: 'lazy-styles', warning: '1kb', error: '1kb', baseline: '2kb' },
        ],
      });

      await harness.writeFile(
        'src/lazy-styles.css',
        `
          .foo { color: green; padding: 1px; }
        `.repeat(24),
      );

      const { result, logs } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      expectNoLog(logs, 'lazy-styles failed to meet minimum budget');
    });

    CSS_EXTENSIONS.forEach((ext) => {
      it(`shows warnings for large component ${ext} when using 'anyComponentStyle' when AOT`, async () => {
        const cssContent = `
          .foo { color: white; padding: 1px; }
          .buz { color: white; padding: 2px; }
          .bar { color: white; padding: 3px; }
        `;

        await harness.writeFiles({
          [`src/app/app.component.${ext}`]: cssContent,
          [`src/assets/foo.${ext}`]: cssContent,
          [`src/styles.${ext}`]: cssContent,
        });

        await harness.modifyFile('src/app/app.component.ts', (content) =>
          content.replace('app.component.css', `app.component.${ext}`),
        );

        harness.useTarget('build', {
          ...BASE_OPTIONS,
          optimization: true,
          aot: true,
          styles: [`src/styles.${ext}`],
          budgets: [{ type: Type.AnyComponentStyle, maximumWarning: '1b' }],
        });

        const { result, logs } = await harness.executeOnce();
        expect(result?.success).toBe(true);
        expectLog(logs, new RegExp(`app.component.${ext}`));
      });
    });

    describe(`should ignore '.map' files`, () => {
      it(`when 'bundle' budget`, async () => {
        harness.useTarget('build', {
          ...BASE_OPTIONS,
          sourceMap: true,
          optimization: true,
          extractLicenses: true,
          budgets: [{ type: Type.Bundle, name: 'main', maximumError: '1mb' }],
        });

        const { result, logs } = await harness.executeOnce();
        expect(result?.success).toBe(true);
        expectNoLog(logs, BUDGET_NOT_MET_REGEXP);
      });

      it(`when 'intial' budget`, async () => {
        harness.useTarget('build', {
          ...BASE_OPTIONS,
          sourceMap: true,
          optimization: true,
          extractLicenses: true,
          budgets: [{ type: Type.Initial, name: 'main', maximumError: '1mb' }],
        });

        const { result, logs } = await harness.executeOnce();
        expect(result?.success).toBe(true);
        expectNoLog(logs, BUDGET_NOT_MET_REGEXP);
      });

      it(`when 'all' budget`, async () => {
        harness.useTarget('build', {
          ...BASE_OPTIONS,
          sourceMap: true,
          optimization: true,
          extractLicenses: true,
          budgets: [{ type: Type.All, maximumError: '1mb' }],
        });

        const { result, logs } = await harness.executeOnce();
        expect(result?.success).toBe(true);
        expectNoLog(logs, BUDGET_NOT_MET_REGEXP);
      });

      it(`when 'any' budget`, async () => {
        harness.useTarget('build', {
          ...BASE_OPTIONS,
          sourceMap: true,
          optimization: true,
          extractLicenses: true,
          budgets: [{ type: Type.Any, maximumError: '1mb' }],
        });

        const { result, logs } = await harness.executeOnce();
        expect(result?.success).toBe(true);
        expectNoLog(logs, BUDGET_NOT_MET_REGEXP);
      });
    });
  });
});
