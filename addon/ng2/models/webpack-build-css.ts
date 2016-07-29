import * as path from 'path';
import * as ExtractTextPlugin from 'extract-text-webpack-plugin';
import * as existsSync from 'exists-sync';
import { CliConfig } from './config';

export function getWebpackCSSConfig(projectRoot: string, sourceDir: string) {
  const styles = CliConfig.fromProject().apps.map(app => app.styles);
  let entries = {};

  styles.forEach(style => {
    for (let src in style) {
      if (existsSync(path.resolve(projectRoot, src))) {
        entries[style[src].output] = path.resolve(projectRoot, `./${src}`);
      }
    }
  });

  return {
    name: 'styles',
    resolve: {
      root: path.resolve(projectRoot)
    },
    context: path.resolve(__dirname),
    entry: entries,
    output: {
      path: path.resolve(projectRoot, './dist'),
      filename: '[name]'
    },
    module: {
      loaders: [
        { test: /\.css$/i, loader: ExtractTextPlugin.extract(['css-loader']) },
        { test: /\.sass$|\.scss$/i, loader: ExtractTextPlugin.extract(['css-loader', 'sass-loader']) },
        { test: /\.less$/i, loader: ExtractTextPlugin.extract(['css-loader', 'less-loader']) },
        { test: /\.styl$/i, loader: ExtractTextPlugin.extract(['css-loader', 'stylus-loader']) }
      ]
    },
    plugins: [
      new ExtractTextPlugin('[name]')
    ]
  }
};
