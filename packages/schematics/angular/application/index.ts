/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  MergeStrategy,
  Rule,
  SchematicContext,
  SchematicsException,
  Tree,
  apply,
  chain,
  filter,
  mergeWith,
  move,
  noop,
  schematic,
  template,
  url,
} from '@angular-devkit/schematics';
import * as ts from 'typescript';
import * as stringUtils from '../strings';
import { addBootstrapToModule, addImportToModule } from '../utility/ast-utils';
import { InsertChange } from '../utility/change';
import { Schema as ApplicationOptions } from './schema';


function addBootstrapToNgModule(directory: string, sourceDir: string): Rule {
  return (host: Tree) => {
    const modulePath = `${directory}/${sourceDir}/app/app.module.ts`;
    const content = host.read(modulePath);
    if (!content) {
      throw new SchematicsException(`File ${modulePath} does not exist.`);
    }
    const sourceText = content.toString('utf-8');
    const source = ts.createSourceFile(modulePath, sourceText, ts.ScriptTarget.Latest, true);

    const componentModule = './app.component';

    const importChanges = addImportToModule(source,
                                            modulePath,
                                            'BrowserModule',
                                            '@angular/platform-browser');
    const bootstrapChanges = addBootstrapToModule(source,
                                                  modulePath,
                                                  'AppComponent',
                                                  componentModule);
    const changes = [
      ...importChanges,
      ...bootstrapChanges,
    ];

    const recorder = host.beginUpdate(modulePath);
    for (const change of changes) {
      if (change instanceof InsertChange) {
        recorder.insertLeft(change.pos, change.toAdd);
      }
    }
    host.commitUpdate(recorder);

    return host;
  };
}

function minimalPathFilter(path: string): boolean {
  const toRemoveList: RegExp[] = [/e2e\//, /editorconfig/, /README/, /karma.conf.js/,
                                  /protractor.conf.js/, /test.ts/, /tsconfig.spec.json/,
                                  /tslint.json/, /favicon.ico/];

  return !toRemoveList.some(re => re.test(path));
}
export default function (options: ApplicationOptions): Rule {
  return (host: Tree, context: SchematicContext) => {
    const appRootSelector = `${options.prefix}-root`;
    const componentOptions = !options.minimal ?
      {
        inlineStyle: options.inlineStyle,
        inlineTemplate: options.inlineTemplate,
        spec: !options.skipTests,
        styleext: options.style,
      } :
      {
        inlineStyle: true,
        inlineTemplate: true,
        spec: false,
        styleext: options.style,
      };
    const sourceDir = options.sourceDir || 'src';

    return chain([
      mergeWith(
        apply(url('./files'), [
          options.minimal ? filter(minimalPathFilter) : noop(),
          template({
            utils: stringUtils,
            'dot': '.',
            ...options as object,
          }),
          move(options.directory),
        ])),
      schematic('module', {
        name: 'app',
        commonModule: false,
        flat: true,
        routing: options.routing,
        routingScope: 'Root',
        sourceDir: options.directory + '/' + sourceDir,
        spec: false,
      }),
      schematic('component', {
        name: 'app',
        selector: appRootSelector,
        sourceDir: options.directory + '/' + sourceDir,
        flat: true,
        ...componentOptions,
      }),
      addBootstrapToNgModule(options.directory, sourceDir),
      mergeWith(
        apply(url('./other-files'), [
          componentOptions.inlineTemplate ? filter(path => !path.endsWith('.html')) : noop(),
          !componentOptions.spec ? filter(path => !path.endsWith('.spec.ts')) : noop(),
          template({
            utils: stringUtils,
            ...options as any,  // tslint:disable-line:no-any
            selector: appRootSelector,
            ...componentOptions,
          }),
          move(options.directory + '/' + sourceDir + '/app'),
        ]), MergeStrategy.Overwrite),
    ])(host, context);
  };
}
