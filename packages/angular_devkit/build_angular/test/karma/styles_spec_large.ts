/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { runTargetSpec } from '@angular-devkit/architect/testing';
import { tap } from 'rxjs/operators';
import { host, karmaTargetSpec } from '../utils';


describe('Karma Builder global styles', () => {
  beforeEach(done => host.initialize().toPromise().then(done, done.fail));
  afterEach(done => host.restore().toPromise().then(done, done.fail));

  it('works', (done) => {
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
        import { HttpModule } from '@angular/http';
        import { AppComponent } from './app.component';

        describe('AppComponent', () => {
          beforeEach(async(() => {
            TestBed.configureTestingModule({
              imports: [
                HttpModule
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

    runTargetSpec(host, karmaTargetSpec).pipe(
      tap(buildEvent => expect(buildEvent.success).toBe(true)),
    ).toPromise().then(done, done.fail);
  });
});
