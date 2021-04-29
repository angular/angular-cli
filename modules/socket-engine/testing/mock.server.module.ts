/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Component, Inject, InjectionToken, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ServerModule } from '@angular/platform-server';

@Component({ selector: 'root', template: 'some template' })
export class MockComponent {}

@NgModule({
  imports: [BrowserModule.withServerTransition({ appId: 'mock' }), ServerModule],
  declarations: [MockComponent],
  bootstrap: [MockComponent],
})
export class MockServerModule {}

@Component({ selector: 'root', template: 'some template' })
export class ErrorComponent {
  constructor() {
    throw new Error('Error!');
  }
}

@NgModule({
  imports: [BrowserModule.withServerTransition({ appId: 'mock' }), ServerModule],
  declarations: [ErrorComponent],
  bootstrap: [ErrorComponent],
})
export class ErrorServerModule {}

export const SOME_TOKEN = new InjectionToken<string>('SOME_TOKEN');

@Component({ selector: 'root', template: `message:{{ _someToken.message }}` })
export class TokenComponent {
  constructor(@Inject(SOME_TOKEN) public readonly _someToken: any) {}
}

@NgModule({
  imports: [BrowserModule.withServerTransition({ appId: 'mock' }), ServerModule],
  declarations: [TokenComponent],
  bootstrap: [TokenComponent],
})
export class TokenServerModule {}
