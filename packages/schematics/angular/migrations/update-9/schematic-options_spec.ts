/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';

const workspacePath = '/angular.json';

describe('Migration to version 9', () => {
  describe('Migrate workspace config', () => {
    const schematicRunner = new SchematicTestRunner(
      'migrations',
      require.resolve('../migration-collection.json'),
    );

    let tree: UnitTestTree;

    beforeEach(async () => {
      tree = new UnitTestTree(new EmptyTree());
      tree = await schematicRunner
        .runExternalSchematicAsync(
          require.resolve('../../collection.json'),
          'ng-new',
          {
            name: 'migration-test',
            version: '1.2.3',
            directory: '.',
          },
          tree,
        )
        .toPromise();
    });

    describe('schematic options', () => {
      function getI18NConfig(localId: string): object {
        return {
          outputPath: `dist/my-project/${localId}/`,
          i18nFile: `src/locale/messages.${localId}.xlf`,
          i18nFormat: 'xlf',
          i18nLocale: localId,
        };
      }

      it('should replace styleext with style', async () => {
        const workspace = JSON.parse(tree.readContent(workspacePath));
        workspace.schematics = {
          '@schematics/angular:component': {
            styleext: 'scss',
          },
        };
        tree.overwrite(workspacePath, JSON.stringify(workspace, undefined, 2));

        const tree2 = await schematicRunner.runSchematicAsync('schematic-options-9', {}, tree.branch()).toPromise();
        const { schematics } = JSON.parse(tree2.readContent(workspacePath));
        expect(schematics['@schematics/angular:component'].styleext).toBeUndefined();
        expect(schematics['@schematics/angular:component'].style).toBe('scss');
      });

      it('should not replace styleext with style in non-Angular schematic', async () => {
        const workspace = JSON.parse(tree.readContent(workspacePath));
        workspace.schematics = {
          '@schematics/some-other:component': {
            styleext: 'scss',
          },
        };
        tree.overwrite(workspacePath, JSON.stringify(workspace, undefined, 2));

        const tree2 = await schematicRunner.runSchematicAsync('schematic-options-9', {}, tree.branch()).toPromise();
        const { schematics } = JSON.parse(tree2.readContent(workspacePath));
        expect(schematics['@schematics/some-other:component'].styleext).toBe('scss');
        expect(schematics['@schematics/some-other:component'].style).toBeUndefined();
      });

      it('should replace spec (false) with skipTests (true)', async () => {
        const workspace = JSON.parse(tree.readContent(workspacePath));
        workspace.schematics = {
          '@schematics/angular:component': {
            spec: false,
          },
        };
        tree.overwrite(workspacePath, JSON.stringify(workspace, undefined, 2));

        const tree2 = await schematicRunner.runSchematicAsync('schematic-options-9', {}, tree.branch()).toPromise();
        const { schematics } = JSON.parse(tree2.readContent(workspacePath));
        expect(schematics['@schematics/angular:component'].spec).toBeUndefined();
        expect(schematics['@schematics/angular:component'].skipTests).toBe(true);
      });

      it('should replace spec (true) with skipTests (false)', async () => {
        const workspace = JSON.parse(tree.readContent(workspacePath));
        workspace.schematics = {
          '@schematics/angular:component': {
            spec: true,
          },
        };
        tree.overwrite(workspacePath, JSON.stringify(workspace, undefined, 2));

        const tree2 = await schematicRunner.runSchematicAsync('schematic-options-9', {}, tree.branch()).toPromise();
        const { schematics } = JSON.parse(tree2.readContent(workspacePath));
        expect(schematics['@schematics/angular:component'].spec).toBeUndefined();
        expect(schematics['@schematics/angular:component'].skipTests).toBe(false);
      });

      it('should replace spec with skipTests for multiple Angular schematics', async () => {
        const workspace = JSON.parse(tree.readContent(workspacePath));
        workspace.schematics = {
          '@schematics/angular:component': {
            spec: false,
          },
          '@schematics/angular:directive': {
            spec: false,
          },
          '@schematics/angular:service': {
            spec: true,
          },
          '@schematics/angular:module': {
            spec: false,
          },
          '@schematics/angular:guard': {
            spec: true,
          },
        };
        tree.overwrite(workspacePath, JSON.stringify(workspace, undefined, 2));

        const tree2 = await schematicRunner.runSchematicAsync('schematic-options-9', {}, tree.branch()).toPromise();
        const { schematics } = JSON.parse(tree2.readContent(workspacePath));
        for (const key of Object.keys(workspace.schematics)) {
          expect(schematics[key].spec).toBeUndefined();
          expect(schematics[key].skipTests).toBe(!workspace.schematics[key].spec);
        }
      });

      it('should replace both styleext with style and spec with skipTests', async () => {
        const workspace = JSON.parse(tree.readContent(workspacePath));
        workspace.schematics = {
          '@schematics/angular:component': {
            styleext: 'scss',
            spec: false,
          },
        };
        tree.overwrite(workspacePath, JSON.stringify(workspace, undefined, 2));

        const tree2 = await schematicRunner.runSchematicAsync('schematic-options-9', {}, tree.branch()).toPromise();
        const { schematics } = JSON.parse(tree2.readContent(workspacePath));
        expect(schematics['@schematics/angular:component'].styleext).toBeUndefined();
        expect(schematics['@schematics/angular:component'].style).toBe('scss');
        expect(schematics['@schematics/angular:component'].spec).toBeUndefined();
        expect(schematics['@schematics/angular:component'].skipTests).toBe(true);
      });

      it('should replace both styleext with style and spec with skipTests in a project', async () => {
        const workspace = JSON.parse(tree.readContent(workspacePath));
        workspace.projects['migration-test'].schematics = {
          '@schematics/angular:component': {
            styleext: 'scss',
            spec: false,
          },
        };
        tree.overwrite(workspacePath, JSON.stringify(workspace, undefined, 2));

        const tree2 = await schematicRunner.runSchematicAsync('schematic-options-9', {}, tree.branch()).toPromise();
        const { projects: { 'migration-test': { schematics } } } = JSON.parse(tree2.readContent(workspacePath));
        expect(schematics['@schematics/angular:component'].styleext).toBeUndefined();
        expect(schematics['@schematics/angular:component'].style).toBe('scss');
        expect(schematics['@schematics/angular:component'].spec).toBeUndefined();
        expect(schematics['@schematics/angular:component'].skipTests).toBe(true);
      });

    });
  });
});
