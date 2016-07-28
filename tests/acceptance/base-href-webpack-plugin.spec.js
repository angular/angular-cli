/*eslint-disable no-console */
'use strict';

var expect = require('chai').expect;
var BaseHrefWebpackPlugin = require('../../addon/ng2/utilities/base-href-webpack-plugin').BaseHrefWebpackPlugin;

function mockCompiler(indexHtml, callback) {
  return {
    plugin: function (event, compilerCallback) {
      var compilation = {
        plugin: function (hook, compilationCallback) {
          var htmlPluginData = {
            html: indexHtml
          };
          compilationCallback(htmlPluginData, callback);
        }
      };
      compilerCallback(compilation);
    }
  };
}

describe('base href webpack plugin', function () {
  it('should do nothing when baseHref is null', function () {
    var plugin = new BaseHrefWebpackPlugin({ baseHref: null });

    var compiler = mockCompiler('<body><head></head></body>', function (x, htmlPluginData) {
      expect(htmlPluginData.html).to.equal('<body><head></head></body>');
    });
    plugin.apply(compiler);
  });

  it('should insert base tag when not exist', function () {
    var plugin = new BaseHrefWebpackPlugin({ baseHref: '/' });

    var compiler = mockCompiler('<body><head></head></body>', function (x, htmlPluginData) {
      expect(htmlPluginData.html).to.equal('<body><head><base href="/"></head></body>');
    });
    plugin.apply(compiler);
  });

  it('should replace href attribute when base tag already exists', function () {
    var plugin = new BaseHrefWebpackPlugin({ baseHref: '/myUrl/' });

    var compiler = mockCompiler('<body><head><base href="/" target="_blank"></head></body>', function (x, htmlPluginData) {
      expect(htmlPluginData.html).to.equal('<body><head><base href="/myUrl/" target="_blank"></head></body>');
    });
    plugin.apply(compiler);
  });
});
