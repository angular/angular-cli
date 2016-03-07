import universal = require('angular2-universal-preview');

export interface IUniversalConfig {
  preboot: boolean;
  bootloader: any;
  componentProviders: any[];
  platformProviders: any[];
  directives: any[];
  providers: any[];
}

class Angular2Prerender {
  constructor(private options: IUniversalConfig) {}

  render(file) {
    let clientHtml: string = file.toString();

    // bootstrap and render component to string
    var bootloader = this.options.bootloader;
    if (!this.options.bootloader) {
      this.options.bootloader = {
        document: universal.parseDocument(clientHtml),
        providers: this.options.providers,
        componentProviders: this.options.componentProviders,
        platformProviders: this.options.platformProviders,
        directives: this.options.directives,
        preboot: this.options.preboot
      };
    }
    bootloader = universal.Bootloader.create(this.options.bootloader);

    return bootloader.serializeApplication().then(html => new Buffer(html));
  }
}


export class WebpackAngular2Prerender {

  private prerender;

  constructor(private options: IUniversalConfig) {
    this.prerender = new Angular2Prerender(options);
  }

  apply(compiler) {

    compiler.plugin('emit', (compilation, callback) => {

      for (var file in compilation.assets) {
        if (compilation.assets.hasOwnProperty(file)) {
          this.prerender
              .render(file)
              .then( (buffer) => compilation.assets[file] = buffer);
        }
      }

      callback();
    });
  }
}
