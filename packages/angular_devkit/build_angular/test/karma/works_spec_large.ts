/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Architect } from '@angular-devkit/architect';
import { createArchitect, host, karmaTargetSpec } from '../utils';


// tslint:disable-next-line:no-big-function
describe('Karma Builder', () => {
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });

  afterEach(() => host.restore().toPromise());

  it('runs', async () => {
    const run = await architect.scheduleTarget(karmaTargetSpec);

    await expectAsync(run.result).toBeResolvedTo(jasmine.objectContaining({ success: true }));

    await run.stop();
  });

  it('fails with broken compilation', async () => {
    host.writeMultipleFiles({
      'src/app/app.component.spec.ts': '<p> definitely not typescript </p>',
    });

    const run = await architect.scheduleTarget(karmaTargetSpec);

    await expectAsync(run.result).toBeResolvedTo(jasmine.objectContaining({ success: false }));

    await run.stop();
  });

  it('supports ES2015 target', async () => {
    host.replaceInFile('tsconfig.json', '"target": "es5"', '"target": "es2015"');

    const run = await architect.scheduleTarget(karmaTargetSpec);

    await expectAsync(run.result).toBeResolvedTo(jasmine.objectContaining({ success: true }));

    await run.stop();
  });

  it('generates and uses global styles', async () => {
    host.writeMultipleFiles({
      'src/styles.css': 'p {display: none}',
      'src/app/app.component.ts': `
        import { Component } from '@angular/core';

        @Component({
          selector: 'app-root',
          template: '<p>Hello World</p>'
        })
        export class AppComponent {
        }
       `,
      'src/app/app.component.spec.ts': `
        import { TestBed, async } from '@angular/core/testing';
        import { AppComponent } from './app.component';

        describe('AppComponent', () => {
          beforeEach(async(() => {
            TestBed.configureTestingModule({
              imports: [
              ],
              declarations: [
                AppComponent
              ]
            }).compileComponents();
          }));

          it('should not contain text that is hidden via css', async(() => {
            const fixture = TestBed.createComponent(AppComponent);
            expect(fixture.nativeElement.innerText).not.toContain('Hello World');
          }));
        });`,
    });

    const run = await architect.scheduleTarget(karmaTargetSpec);

    await expectAsync(run.result).toBeResolvedTo(jasmine.objectContaining({ success: true }));

    await run.stop();
  });

  it('generates and uses assets', async () => {
    const assets: { [path: string]: string } = {
      './src/string-file-asset.txt': 'string-file-asset.txt',
      './src/string-folder-asset/file.txt': 'string-folder-asset.txt',
      './src/glob-asset.txt': 'glob-asset.txt',
      './src/folder/folder-asset.txt': 'folder-asset.txt',
      './src/output-asset.txt': 'output-asset.txt',
    };
    host.writeMultipleFiles(assets);
    host.writeMultipleFiles({
      'src/app/app.module.ts': `
        import { BrowserModule } from '@angular/platform-browser';
        import { NgModule } from '@angular/core';
        import { HttpClientModule } from '@angular/common/http';
        import { AppComponent } from './app.component';

        @NgModule({
          declarations: [
            AppComponent
          ],
          imports: [
            BrowserModule,
            HttpClientModule
          ],
          providers: [],
          bootstrap: [AppComponent]
        })
        export class AppModule { }
      `,
      'src/app/app.component.ts': `
        import { Component } from '@angular/core';
        import { HttpClient } from '@angular/common/http';

        @Component({
          selector: 'app-root',
          template: '<p *ngFor="let asset of assets">{{asset.content }}</p>'
        })
        export class AppComponent {
          public assets = [
            { path: './string-file-asset.txt', content: '' },
            { path: './string-folder-asset/file.txt', content: '' },
            { path: './glob-asset.txt', content: '' },
            { path: './folder/folder-asset.txt', content: '' },
            { path: './output-folder/output-asset.txt', content: '' },
          ];
          constructor(private http: HttpClient) {
            this.assets.forEach(asset => http.get(asset.path, { responseType: 'text' })
              .subscribe(res => asset.content = res));
          }
        }`,
      'src/app/app.component.spec.ts': `
        import { TestBed, async } from '@angular/core/testing';
        import { HttpClientModule } from '@angular/common/http';
        import { AppComponent } from './app.component';

        describe('AppComponent', () => {
          beforeEach(async(() => {
            TestBed.configureTestingModule({
              imports: [
                HttpClientModule
              ],
              declarations: [
                AppComponent
              ]
            }).compileComponents();
          }));

          it('should create the app', async(() => {
            const fixture = TestBed.createComponent(AppComponent);
            const app = fixture.debugElement.componentInstance;
            expect(app).toBeTruthy();
          }));
        });`,
    });

    const overrides = {
      assets: [
        'src/string-file-asset.txt',
        'src/string-folder-asset',
        { glob: 'glob-asset.txt', input: 'src/', output: '/' },
        { glob: 'output-asset.txt', input: 'src/', output: '/output-folder' },
        { glob: '**/*', input: 'src/folder', output: '/folder' },
      ],
    };

    const run = await architect.scheduleTarget(karmaTargetSpec, overrides);

    await expectAsync(run.result).toBeResolvedTo(jasmine.objectContaining({ success: true }));

    await run.stop();
  });

  it('allows file replacements', async () => {
    host.writeMultipleFiles({
      'src/meaning-too.ts': 'export var meaning = 42;',
      'src/meaning.ts': `export var meaning = 10;`,

      'src/test.ts': `
        import { meaning } from './meaning';

        describe('Test file replacement', () => {
          it('should replace file', () => {
            expect(meaning).toBe(42);
          });
        });
      `,
    });

    const overrides = {
      fileReplacements: [{
        replace: '/src/meaning.ts',
        with: '/src/meaning-too.ts',
      }],
    };

    const run = await architect.scheduleTarget(karmaTargetSpec, overrides);

    await expectAsync(run.result).toBeResolvedTo(jasmine.objectContaining({ success: true }));

    await run.stop();
  });
});
