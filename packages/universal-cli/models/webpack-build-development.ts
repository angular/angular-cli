const path = require('path');

export const getWebpackDevConfigPartial = function(projectRoot: string, appConfig: any) {
  const appRoot = path.resolve(projectRoot, appConfig.root);
  const styles = appConfig.styles
               ? appConfig.styles.map((style: string) => path.resolve(appRoot, style))
               : [];
  const cssLoaders = ['style-loader', 'css-loader?sourcemap', 'postcss-loader'];
  return {
    output: {
      path: path.resolve(projectRoot, appConfig.outDir),
      filename: '[name].bundle.js',
      sourceMapFilename: '[name].bundle.map',
      chunkFilename: '[id].chunk.js'
    },
    module: {
      rules: [
        // outside of main, load it via style-loader for development builds
        {
          include: styles,
          test: /\.css$/,
          loaders: cssLoaders
        }, {
          include: styles,
          test: /\.styl$/,
          loaders: [...cssLoaders, 'stylus-loader?sourcemap']
        }, {
          include: styles,
          test: /\.less$/,
          loaders: [...cssLoaders, 'less-loader?sourcemap']
        }, {
          include: styles,
          test: /\.scss$|\.sass$/,
          loaders: [...cssLoaders, 'sass-loader?sourcemap']
        },
      ]
    }
  };
};
