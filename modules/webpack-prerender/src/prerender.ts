import universal = require('angular2-universal-preview');

export interface IUniversalConfig {
  preboot: boolean;
  App: any;
  providers: any[];
}

class Angular2Prerender {
  constructor(private options){}
  
  render(file) {
    
    let str: string = file.toString();

    let renderPromise = universal.renderToString;
    let args = [this.options.App, this.options.providers];

    if (this.options.preboot) {
      renderPromise = universal.renderToStringWithPreboot;
      args.push(this.options.preboot);
    }

    return renderPromise.apply(null, args)
      .then((serializedApp) => {
        let html = str.replace(
          // <selector></selector>
          universal.selectorRegExpFactory(universal.selectorResolver(this.options.App)),
          // <selector>{{ serializedCmp }}</selector>
          serializedApp
        );

        return new Buffer(html);
      });
  }
}


export class WebpackAngular2Prerender {

  private prerender;

  constructor(private options: IUniversalConfig) {
    this.prerender = new Angular2Prerender(options);
  }

  apply(compiler) {
    
    compiler.plugin('emit', (compilation, callback) => {
      
      for(var file in compilation.assets) {
          this.prerender
              .render(file)
              .then( (buffer) => compilation.assets[file] = buffer);
      }

      callback();
    });
  }
}
