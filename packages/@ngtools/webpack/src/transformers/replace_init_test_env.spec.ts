import * as ts from 'typescript';
import { oneLine, stripIndent } from 'common-tags';
import { transformTypescript } from './ast_helpers';
import { replaceInitTestEnv } from './replace_init_test_env';

describe('@ngtools/webpack transformers', () => {
  describe('replace_init_test_env', () => {
    it('should replace initTestEnvironment', () => {
      const input = stripIndent`
        import { getTestBed } from '@angular/core/testing';
        import {
          BrowserDynamicTestingModule,
          platformBrowserDynamicTesting
        } from '@angular/platform-browser-dynamic/testing';

        getTestBed().initTestEnvironment(BrowserDynamicTestingModule,
          platformBrowserDynamicTesting());
      `;
      const output = stripIndent`
        import { getTestBed } from '@angular/core/testing';
        import {
          BrowserDynamicTestingModule,
          platformBrowserDynamicTesting
        } from '@angular/platform-browser-dynamic/testing';
        import { AppModuleNgSummary } from "./app/app.module.ngsummary";

        getTestBed().initTestEnvironment(BrowserDynamicTestingModule,
          platformBrowserDynamicTesting(), () => [AppModuleNgSummary]);
      `;

      const transformOpsCb = (sourceFile: ts.SourceFile) =>
        replaceInitTestEnv(sourceFile, [{ className: 'AppModule', path: './app/app.module' }]);
      const result = transformTypescript(input, transformOpsCb);

      expect(oneLine`${result}`).toEqual(oneLine`${output}`);
    });
  });
});
