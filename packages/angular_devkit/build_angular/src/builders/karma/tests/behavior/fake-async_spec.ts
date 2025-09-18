/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { execute } from '../../index';
import { BASE_OPTIONS, KARMA_BUILDER_INFO, describeKarmaBuilder } from '../setup';

describeKarmaBuilder(execute, KARMA_BUILDER_INFO, (harness, setupTarget) => {
  describe('Behavior: "fakeAsync"', () => {
    beforeEach(async () => {
      await setupTarget(harness);
    });

    it('loads zone.js/testing at the right time', async () => {
      await harness.writeFiles({
        './src/app/app.component.ts': `
            import { Component } from '@angular/core';

            @Component({
              selector: 'app-root',
              standalone: false,
              template: '<button (click)="changeMessage()" class="change">{{ message }}</button>',
            })
            export class AppComponent {
              message = 'Initial';

              changeMessage() {
                setTimeout(() => {
                  this.message = 'Changed';
                }, 1000);
              }
            }`,
        './src/app/app.component.spec.ts': `
            import { provideZoneChangeDetection } from '@angular/core';
            import { TestBed, fakeAsync, tick } from '@angular/core/testing';
            import { By } from '@angular/platform-browser';
            import { AppComponent } from './app.component';

            describe('AppComponent', () => {
              beforeEach(() => TestBed.configureTestingModule({
                providers: [provideZoneChangeDetection()],
                declarations: [AppComponent]
              }));

              it('allows terrible things that break the most basic assumptions', fakeAsync(() => {
                const fixture = TestBed.createComponent(AppComponent);

                const btn = fixture.debugElement
                  .query(By.css('button.change'));

                fixture.detectChanges();
                expect(btn.nativeElement.innerText).toBe('Initial');

                btn.triggerEventHandler('click', null);

                // Pre-tick: Still the old value.
                fixture.detectChanges();
                expect(btn.nativeElement.innerText).toBe('Initial');

                tick(1500);

                fixture.detectChanges();
                expect(btn.nativeElement.innerText).toBe('Changed');
              }));
            });`,
      });

      harness.useTarget('test', {
        ...BASE_OPTIONS,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });
  });
});
