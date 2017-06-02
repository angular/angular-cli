import { writeMultipleFiles } from '../../utils/fs';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';
import { expectToFail } from '../../utils/utils';
import { getGlobalVariable } from '../../utils/env';
import { stripIndent } from 'common-tags';

export default function () {
  // Skip this in Appveyor tests.
  if (getGlobalVariable('argv').appveyor) {
    return Promise.resolve();
  }

  return Promise.resolve()
    .then(() => ng('test', '--watch=false'))
    // prepare global scripts test files
    .then(() => writeMultipleFiles({
      'src/string-script.js': `stringScriptGlobal = 'string-scripts.js';`,
      'src/input-script.js': `inputScriptGlobal = 'input-scripts.js';`,
      'src/typings.d.ts': stripIndent`
        declare var stringScriptGlobal: any;
        declare var inputScriptGlobal: any;
      `,
      'src/app/app.component.ts': stripIndent`
        import { Component } from '@angular/core';

        @Component({ selector: 'app-root', template: '' })
        export class AppComponent {
          stringScriptGlobalProp = stringScriptGlobal;
          inputScriptGlobalProp = inputScriptGlobal;
        }
      `,
      'src/app/app.component.spec.ts': stripIndent`
        import { TestBed, async } from '@angular/core/testing';
        import { AppComponent } from './app.component';

        describe('AppComponent', () => {
          beforeEach(async(() => {
            TestBed.configureTestingModule({
              declarations: [ AppComponent ]
            }).compileComponents();
          }));

          it('should have access to string-script.js', async(() => {
            let app = TestBed.createComponent(AppComponent).debugElement.componentInstance;
            expect(app.stringScriptGlobalProp).toEqual('string-scripts.js');
          }));

          it('should have access to input-script.js', async(() => {
            let app = TestBed.createComponent(AppComponent).debugElement.componentInstance;
            expect(app.inputScriptGlobalProp).toEqual('input-scripts.js');
          }));
        });

        describe('Spec', () => {
          it('should have access to string-script.js', async(() => {
            expect(stringScriptGlobal).toBe('string-scripts.js');
          }));

          it('should have access to input-script.js', async(() => {
            expect(inputScriptGlobal).toBe('input-scripts.js');
          }));
        });
      `
    }))
    // should fail because the global scripts were not added to scripts array
    .then(() => expectToFail(() => ng('test', '--single-run')))
    .then(() => updateJsonFile('.angular-cli.json', configJson => {
      const app = configJson['apps'][0];
      app['scripts'] = [
        'string-script.js',
        { input: 'input-script.js' }
      ];
    }))
    // should pass now
    .then(() => ng('test', '--single-run'));
}

