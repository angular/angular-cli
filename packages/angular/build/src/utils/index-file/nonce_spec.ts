/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { addNonce } from './nonce';

describe('addNonce', () => {
  it('should add the nonce expression to all inline style tags', async () => {
    const result = await addNonce(`
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
    const result = await addNonce(`
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
    const result = await addNonce(`
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
    const result = await addNonce(`
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

  it('should to all script tags', async () => {
    const result = await addNonce(`
      <html>
        <head>
        </head>
        <body>
          <app ngCspNonce="{% nonce %}"></app>
          <script>console.log('foo');</script>
          <script src="./main.js"></script>
          <script>console.log('bar');</script>
        </body>
      </html>
    `);

    expect(result).toContain(`<script nonce="{% nonce %}">console.log('foo');</script>`);
    expect(result).toContain('<script src="./main.js" nonce="{% nonce %}"></script>');
    expect(result).toContain(`<script nonce="{% nonce %}">console.log('bar');</script>`);
  });
});
