/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { execute } from '../../index';
import { BASE_OPTIONS, KARMA_BUILDER_INFO, describeBuilder } from '../setup';

describeBuilder(execute, KARMA_BUILDER_INFO, (harness) => {
  describe('Option: "styles"', () => {
    it('includes unnamed styles in compilation', async () => {
      await harness.writeFiles({
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
          import { TestBed } from '@angular/core/testing';
          import { AppComponent } from './app.component';
  
          describe('AppComponent', () => {
            beforeEach(async () => {
              await TestBed.configureTestingModule({
                imports: [
                ],
                declarations: [
                  AppComponent
                ]
              }).compileComponents();
            });
  
            it('should not contain text that is hidden via css', () => {
              const fixture = TestBed.createComponent(AppComponent);
              expect(fixture.nativeElement.innerText).not.toContain('Hello World');
            });
          });`,
      });

      harness.useTarget('test', {
        ...BASE_OPTIONS,
        styles: ['src/styles.css'],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });
  });
});
