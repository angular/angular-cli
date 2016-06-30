import {Bootloader, BootloaderConfig, AppConfig} from 'angular2-universal';

export interface IWebpackPrerender {
  templatePath: string;
  bootloaderConfig: BootloaderConfig;
  appConfig: AppConfig;
}

export class Angular2Prerender {

  private bootloader: Bootloader;

  constructor(private options: IWebpackPrerender) {
    // maintain your platform instance
    this.bootloader = new Bootloader(this.options.bootloaderConfig);
  }

  apply(compiler) {
    compiler.plugin('emit', (compilation, callback) => {
      if (compilation.assets.hasOwnProperty(this.options.templatePath)) {
        this.bootloader.serializeApplication({
          // or provide template in config.template
          template: compilation.assets[this.options.templatePath].source(), 
          directives: this.options.appConfig.directives,
          providers: this.options.appConfig.providers
        })
        .then(html => {
          compilation.assets[this.options.templatePath] = {
            source: () => html,
            size: () => html.length
          };
          callback();
        });
      }      
    });
  }
}