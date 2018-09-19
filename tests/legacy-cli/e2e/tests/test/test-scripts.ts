import { writeMultipleFiles } from '../../utils/fs';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';
import { expectToFail } from '../../utils/utils';
import { stripIndent } from 'common-tags';


export default function () {
  // TODO(architect): Delete this test. It is now in devkit/build-angular.

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
    .then(() => expectToFail(() => ng('test', '--watch=false')))
    .then(() => updateJsonFile('angular.json', workspaceJson => {
      const appArchitect = workspaceJson.projects['test-project'].architect;
      appArchitect.test.options.scripts = [
        { input: 'src/string-script.js' },
        { input: 'src/input-script.js' },
      ];
    }))
    // should pass now
    .then(() => ng('test', '--watch=false'));
}

