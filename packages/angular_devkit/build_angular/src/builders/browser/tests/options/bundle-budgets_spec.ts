/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { logging } from '@angular-devkit/core';
import { lazyModuleFiles, lazyModuleFnImport } from '../../../../testing/test-utils';
import { buildWebpackBrowser } from '../../index';
import { Type } from '../../schema';
import { BASE_OPTIONS, BROWSER_BUILDER_INFO, describeBuilder } from '../setup';

describeBuilder(buildWebpackBrowser, BROWSER_BUILDER_INFO, (harness) => {
  const CSS_EXTENSIONS = ['css', 'scss', 'less', 'styl'];
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
      expect(logs).not.toContain(
        jasmine.objectContaining<logging.LogEntry>({
          level: 'warn',
          message: jasmine.stringMatching(BUDGET_NOT_MET_REGEXP),
        }),
      );
    });

    it(`should error when size is above 'maximumError' threshold`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        optimization: true,
        budgets: [{ type: Type.All, maximumError: '100b' }],
      });

      const { result, logs } = await harness.executeOnce();
      expect(result?.success).toBe(false);
      expect(logs).toContain(
        jasmine.objectContaining<logging.LogEntry>({
          level: 'error',
          message: jasmine.stringMatching(BUDGET_NOT_MET_REGEXP),
        }),
      );
    });

    it(`should warn when size is above 'maximumWarning' threshold`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        optimization: true,
        budgets: [{ type: Type.All, maximumWarning: '100b' }],
      });

      const { result, logs } = await harness.executeOnce();
      expect(result?.success).toBe(true);
      expect(logs).toContain(
        jasmine.objectContaining<logging.LogEntry>({
          level: 'warn',
          message: jasmine.stringMatching(BUDGET_NOT_MET_REGEXP),
        }),
      );
    });

    it(`should warn when lazy bundle is above 'maximumWarning' threshold`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        optimization: true,
        budgets: [{ type: Type.Bundle, name: 'lazy-lazy-module', maximumWarning: '100b' }],
      });

      await harness.writeFiles(lazyModuleFiles);
      await harness.writeFiles(lazyModuleFnImport);

      const { result, logs } = await harness.executeOnce();
      expect(result?.success).toBe(true);
      expect(logs).toContain(
        jasmine.objectContaining<logging.LogEntry>({
          level: 'warn',
          message: jasmine.stringMatching('lazy-lazy-module exceeded maximum budget'),
        }),
      );
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
        expect(logs).toContain(
          jasmine.objectContaining<logging.LogEntry>({
            level: 'warn',
            message: jasmine.stringMatching(new RegExp(`Warning.+app.component.${ext}`)),
          }),
        );
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
        expect(logs).not.toContain(
          jasmine.objectContaining<logging.LogEntry>({
            level: 'error',
            message: jasmine.stringMatching(BUDGET_NOT_MET_REGEXP),
          }),
        );
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
        expect(logs).not.toContain(
          jasmine.objectContaining<logging.LogEntry>({
            level: 'error',
            message: jasmine.stringMatching(BUDGET_NOT_MET_REGEXP),
          }),
        );
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
        expect(logs).not.toContain(
          jasmine.objectContaining<logging.LogEntry>({
            level: 'error',
            message: jasmine.stringMatching(BUDGET_NOT_MET_REGEXP),
          }),
        );
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
        expect(logs).not.toContain(
          jasmine.objectContaining<logging.LogEntry>({
            level: 'error',
            message: jasmine.stringMatching(BUDGET_NOT_MET_REGEXP),
          }),
        );
      });
    });
  });
});
