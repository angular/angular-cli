

export interface IWebpackPrerender {
  templatePath: string;
  bootloaderConfig;
  appConfig;
}

export class Angular2Prerender {

  constructor(_options: IWebpackPrerender) {
    // maintain your platform instance
    // this.bootloader = new Bootloader(this.options.bootloaderConfig);
  }

  apply(compiler) {
    compiler.plugin('emit', (_compilation, _callback) => {
      return '';
    });
  }
}
