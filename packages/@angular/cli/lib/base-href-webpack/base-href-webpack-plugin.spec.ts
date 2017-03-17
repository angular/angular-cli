import {oneLineTrim} from 'common-tags';
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
  const html = oneLineTrim`
    <html>
      <head></head>
      <body></body>
    </html>
  `;

  it('should do nothing when baseHref is null', () => {
    const plugin = new BaseHrefWebpackPlugin({ baseHref: null });

    const compiler = mockCompiler(html, (_x: any, htmlPluginData: any) => {
      expect(htmlPluginData.html).toEqual('<body><head></head></body>');
    });
    plugin.apply(compiler);
  });

  it('should insert base tag when not exist', function () {
    const plugin = new BaseHrefWebpackPlugin({ baseHref: '/' });
    const compiler = mockCompiler(html, (_x: any, htmlPluginData: any) => {
        expect(htmlPluginData.html).toEqual(oneLineTrim`
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

    const compiler = mockCompiler(oneLineTrim`
          <head><base href="/" target="_blank"></head>
          <body></body>
        `, (_x: any, htmlPluginData: any) => {
      expect(htmlPluginData.html).toEqual(oneLineTrim`
          <head><base href="/myUrl/" target="_blank"></head>
          <body></body>
        `);
    });
    plugin.apply(compiler);
  });
});
