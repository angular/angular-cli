interface IWebpackDevServerConfigurationOptions {
  contentBase?: boolean | string | string[];
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
  overlay?: boolean | { errors: boolean, warnings: boolean };
  public?: string;
  disableHostCheck?: boolean;
}
