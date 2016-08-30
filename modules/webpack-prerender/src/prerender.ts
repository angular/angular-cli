

export interface IWebpackPrerender {
  templatePath: string;
  bootloaderConfig;
  appConfig;
}

export class Angular2Prerender {

  private bootloader;

  constructor(private options: IWebpackPrerender) {
    // maintain your platform instance
    // this.bootloader = new Bootloader(this.options.bootloaderConfig);
  }

  apply(compiler) {
    compiler.plugin('emit', (compilation, callback) => {
      return '';
    });
  }
}
