interface IWebpackDevServerConfigurationOptions {
  contentBase?: string;
  hot?: boolean;
  historyApiFallback?: {[key: string]: any} | boolean;
  compress?: boolean;
  proxy?: {[key: string]: string};
  staticOptions?: any;
  quiet?: boolean;
  noInfo?: boolean;
  lazy?: boolean;
  filename?: string;
  watchOptions?: {
    aggregateTimeout?: number;
    poll?: number;
  };
  publicPath?: string;
  headers?: { [key: string]: string };
  stats?: { [key: string]: boolean };
  inline: boolean;
  https?: boolean;
  key?: string;
  cert?: string;
}

interface WebpackProgressPluginOutputOptions {
  colors?: boolean;
  chunks?: boolean;
  modules?: boolean;
  reasons?: boolean;
  chunkModules?: boolean;
}

declare var HtmlWebpackPlugin: any;
declare var LoaderOptionsPlugin: any;
