/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { Tree } from '@angular-devkit/schematics';
import { ProjectDefinition, TargetDefinition, WorkspaceDefinition } from '../../utility/workspace';
import {
  hasLessStylesheets,
  hasPostcssConfiguration,
  updateStyleImports,
} from './stylesheet-updates';

interface StylePreprocessorOptions {
  includePaths?: string[];
  otherOption?: boolean;
}

describe('Migration to use application builder: stylesheet updates', () => {
  let tree: Tree;
  let workspace: WorkspaceDefinition;
  let buildTarget: TargetDefinition;

  beforeEach(() => {
    tree = Tree.empty();
    buildTarget = {
      builder: '@angular-devkit/build-angular:browser',
      options: {},
    };

    const testProject: ProjectDefinition = {
      root: 'test',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      targets: new Map([['build', buildTarget]]) as any,
      prefix: 'app',
      sourceRoot: 'test/src',
      extensions: {},
    };

    workspace = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      projects: new Map([['test', testProject]]) as any,
      extensions: {},
    };

    // Create some common files for testing
    tree.create('/node_modules/@angular/material/_index.scss', '// Fake Angular Material styles');
    tree.create('/test/src/styles.scss', '@import "./app/app.component.scss";');
  });

  describe('hasLessStylesheets', () => {
    it('should return true if a .less file exists in the root', () => {
      tree.create('/test.less', '');
      expect(hasLessStylesheets(tree)).toBe(true);
    });

    it('should return true if a .less file exists in a subdirectory', () => {
      tree.create('/src/app.less', '');
      expect(hasLessStylesheets(tree)).toBe(true);
    });

    it('should return false if no .less files exist', () => {
      tree.create('/src/app.css', '');
      expect(hasLessStylesheets(tree)).toBe(false);
    });

    it('should ignore files in node_modules', () => {
      tree.create('/node_modules/library/style.less', '');
      expect(hasLessStylesheets(tree)).toBe(false);
    });

    it('should ignore files in dot-prefixed directories', () => {
      tree.create('/.hidden/style.less', '');
      expect(hasLessStylesheets(tree)).toBe(false);
    });
  });

  describe('hasPostcssConfiguration', () => {
    it('should return true if postcss.config.json exists in the root', () => {
      tree.create('/postcss.config.json', '{}');
      expect(hasPostcssConfiguration(tree, workspace)).toBe(true);
    });

    it('should return true if .postcssrc.json exists in the root', () => {
      tree.create('/.postcssrc.json', '{}');
      expect(hasPostcssConfiguration(tree, workspace)).toBe(true);
    });

    it('should return true if postcss.config.json exists in a project root', () => {
      tree.create('/test/postcss.config.json', '{}');
      expect(hasPostcssConfiguration(tree, workspace)).toBe(true);
    });

    it('should return false if no config files exist', () => {
      expect(hasPostcssConfiguration(tree, workspace)).toBe(false);
    });
  });

  describe('updateStyleImports', () => {
    it('should remove "~" from an @import rule', () => {
      tree.create('/test/src/app/app.component.scss', '@import "~@angular/material";');
      updateStyleImports(tree, 'test/src', buildTarget);
      const content = tree.readText('/test/src/app/app.component.scss');
      expect(content).toBe('@import "@angular/material";');
    });

    it('should remove "~" from a @use rule', () => {
      tree.create('/test/src/app/app.component.scss', '@use "~@angular/material";');
      updateStyleImports(tree, 'test/src', buildTarget);
      const content = tree.readText('/test/src/app/app.component.scss');
      expect(content).toBe('@use "@angular/material";');
    });

    it('should remove "^" and add to externalDependencies', () => {
      tree.create('/test/src/app/app.component.scss', '@import "^my-lib/styles.css";');
      updateStyleImports(tree, 'test/src', buildTarget);
      const content = tree.readText('/test/src/app/app.component.scss');
      expect(content).toBe('@import "my-lib/styles.css";');
      expect(buildTarget.options?.['externalDependencies']).toEqual(['my-lib/styles.css']);
    });

    it('should aggregate multiple external dependencies', () => {
      tree.create('/test/src/app/app.component.scss', '@import "^lib-a";');
      tree.create('/test/src/app/other.component.scss', '@import "^lib-b";');
      updateStyleImports(tree, 'test/src', buildTarget);
      expect(buildTarget.options?.['externalDependencies']).toEqual(['lib-a', 'lib-b']);
    });

    it('should identify a workspace-relative import and add includePaths', () => {
      tree.create('/assets/styles/theme.scss', '// Theme file');
      tree.create('/test/src/app/app.component.scss', '@import "assets/styles/theme.scss";');
      updateStyleImports(tree, 'test/src', buildTarget);
      const styleOptions = buildTarget.options?.['stylePreprocessorOptions'] as
        | StylePreprocessorOptions
        | undefined;
      expect(styleOptions?.includePaths).toEqual(['.']);
    });

    it('should not identify a standard relative import as workspace-relative', () => {
      tree.create('/test/src/app/theme.scss', '// Theme file');
      tree.create('/test/src/app/app.component.scss', '@import "./theme.scss";');
      updateStyleImports(tree, 'test/src', buildTarget);
      const styleOptions = buildTarget.options?.['stylePreprocessorOptions'];
      expect(styleOptions).toBeUndefined();
    });

    it('should correctly add includePaths when stylePreprocessorOptions already exists', () => {
      buildTarget.options ??= {};
      buildTarget.options['stylePreprocessorOptions'] = {
        otherOption: true,
      };
      tree.create('/assets/styles/theme.scss', '// Theme file');
      tree.create('/test/src/app/app.component.scss', '@import "assets/styles/theme.scss";');
      updateStyleImports(tree, 'test/src', buildTarget);
      const styleOptions = buildTarget.options?.['stylePreprocessorOptions'] as
        | StylePreprocessorOptions
        | undefined;
      expect(styleOptions?.includePaths).toEqual(['.']);
      expect(styleOptions?.otherOption).toBe(true);
    });

    it('should correctly add includePaths when includePaths already exists', () => {
      buildTarget.options ??= {};
      buildTarget.options['stylePreprocessorOptions'] = {
        includePaths: ['/some/other/path'],
      };
      tree.create('/assets/styles/theme.scss', '// Theme file');
      tree.create('/test/src/app/app.component.scss', '@import "assets/styles/theme.scss";');
      updateStyleImports(tree, 'test/src', buildTarget);
      const styleOptions = buildTarget.options?.['stylePreprocessorOptions'] as
        | StylePreprocessorOptions
        | undefined;
      expect(styleOptions?.includePaths).toEqual(['/some/other/path', '.']);
    });
  });
});
