/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { addStyleNonce } from './style-nonce';

describe('add-style-nonce', () => {
  it('should add the nonce expression to all inline style tags', async () => {
    const result = await addStyleNonce(`
      <html>
        <head>
          <style>.a {color: red;}</style>
          <style>.b {color: blue;}</style>
        </head>
        <body>
          <app ngCspNonce="{% nonce %}"></app>
        </body>
      </html>
    `);

    expect(result).toContain('<style nonce="{% nonce %}">.a {color: red;}</style>');
    expect(result).toContain('<style nonce="{% nonce %}">.b {color: blue;}</style>');
  });

  it('should add a lowercase nonce expression to style tags', async () => {
    const result = await addStyleNonce(`
      <html>
        <head>
          <style>.a {color: red;}</style>
        </head>
        <body>
          <app ngcspnonce="{% nonce %}"></app>
        </body>
      </html>
    `);

    expect(result).toContain('<style nonce="{% nonce %}">.a {color: red;}</style>');
  });

  it('should preserve any pre-existing nonces', async () => {
    const result = await addStyleNonce(`
      <html>
        <head>
          <style>.a {color: red;}</style>
          <style nonce="{% otherNonce %}">.b {color: blue;}</style>
        </head>
        <body>
          <app ngCspNonce="{% nonce %}"></app>
        </body>
      </html>
    `);

    expect(result).toContain('<style nonce="{% nonce %}">.a {color: red;}</style>');
    expect(result).toContain('<style nonce="{% otherNonce %}">.b {color: blue;}</style>');
  });

  it('should use the first nonce that is defined on the page', async () => {
    const result = await addStyleNonce(`
      <html>
        <head>
          <style>.a {color: red;}</style>
        </head>
        <body>
          <app ngCspNonce="{% nonce %}"></app>
          <other-app ngCspNonce="{% otherNonce %}"></other-app>
        </body>
      </html>
    `);

    expect(result).toContain('<style nonce="{% nonce %}">.a {color: red;}</style>');
  });
});
