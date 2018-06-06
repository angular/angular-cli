/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable
// TODO: cleanup this file, it's copied as is from Angular CLI.

import { tags } from '@angular-devkit/core';
import {BaseHrefWebpackPlugin} from './base-href-webpack-plugin';


function mockCompiler(indexHtml: string, callback: Function) {
  return {
    plugin: function (_event: any, compilerCallback: Function) {
      const compilation = {
        plugin: function (_hook: any, compilationCallback: Function) {
          const htmlPluginData = {
            html: indexHtml
          };
          compilationCallback(htmlPluginData, callback);
        }
      };
      compilerCallback(compilation);
    }
  };
}

describe('base href webpack plugin', () => {
  const html = tags.oneLine`
    <html>
      <head></head>
      <body></body>
    </html>
  `;

  it('should do nothing when baseHref is null', () => {
    const plugin = new BaseHrefWebpackPlugin({ baseHref: null } as any);

    const compiler = mockCompiler(html, (_x: any, htmlPluginData: any) => {
      expect(htmlPluginData.html).toEqual('<body><head></head></body>');
    });
    plugin.apply(compiler);
  });

  it('should insert base tag when not exist', function () {
    const plugin = new BaseHrefWebpackPlugin({ baseHref: '/' });
    const compiler = mockCompiler(html, (_x: any, htmlPluginData: any) => {
        expect(htmlPluginData.html).toEqual(tags.oneLine`
          <html>
            <head><base href="/"></head>
            <body></body>
          </html>
        `);
      });

    plugin.apply(compiler);
  });

  it('should replace href attribute when base tag already exists', function () {
    const plugin = new BaseHrefWebpackPlugin({ baseHref: '/myUrl/' });

    const compiler = mockCompiler(tags.oneLine`
          <head><base href="/" target="_blank"></head>
          <body></body>
        `, (_x: any, htmlPluginData: any) => {
      expect(htmlPluginData.html).toEqual(tags.oneLine`
          <head><base href="/myUrl/" target="_blank"></head>
          <body></body>
        `);
    });
    plugin.apply(compiler);
  });

  it('should replace href attribute when baseHref is empty', function () {
    const plugin = new BaseHrefWebpackPlugin({ baseHref: '' });

    const compiler = mockCompiler(tags.oneLine`
          <head><base href="/" target="_blank"></head>
          <body></body>
        `, (_x: any, htmlPluginData: any) => {
      expect(htmlPluginData.html).toEqual(tags.oneLine`
          <head><base href="" target="_blank"></head>
          <body></body>
        `);
    });
    plugin.apply(compiler);
  });
});
