// Exports the webpack plugins we use internally.

module.exports = {
  BaseHrefWebpackPlugin:
    require('../lib/base-href-webpack/base-href-webpack-plugin').BaseHrefWebpackPlugin,
  GlobCopyWebpackPlugin: require('../plugins/glob-copy-webpack-plugin').GlobCopyWebpackPlugin,
  SuppressExtractedTextChunksWebpackPlugin:
    require('../plugins/suppress-entry-chunks-webpack-plugin')
      .SuppressExtractedTextChunksWebpackPlugin,
  NamedLazyChunksWebpackPlugin:
    require('../plugins/named-lazy-chunks-webpack-plugin').NamedLazyChunksWebpackPlugin
};
