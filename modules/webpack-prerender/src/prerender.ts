import universal = require('angular2-universal-preview');

export interface IUniversalConfig {
  document?: Object;
  template?: string;
  directives: Array<any>;
  providers?: Array<any>;
  preboot?: Object | any;
  bootloader?: any;
  selector?: string;
  serializedCmp?: string;
  server?: boolean;
  client?: boolean;
  componentProviders?: any;
  platformProviders?: any;
}

class Prerender {
  constructor(private options: IUniversalConfig) {}

  render(file) {
    let clientHtml: string = file.toString();

    // bootstrap and render component to string
    var bootloader = this.options.bootloader;
    if (!this.options.bootloader) {
      let doc = universal.parseDocument(clientHtml);
      this.options.document = doc;
      this.options.template = this.options.template || clientHtml;
      this.options.bootloader = this.options;
    }
    bootloader = universal.Bootloader.create(this.options.bootloader);

    return bootloader.serializeApplication()
      .then(html => new Buffer(html));
  }
}


export class Angular2Prerender {

  private prerender;

  constructor(private options: IUniversalConfig) {
    this.prerender = new Prerender(options);
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
