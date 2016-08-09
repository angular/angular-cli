var Handlebars = require('handlebars');

export interface IHandlebarsPluginOptions {
  assetName:string
  data:any
}

export class HandlebarsWebpackPlugin {
  private data:any;
  private assetName:string;

  constructor(private options:IHandlebarsPluginOptions) {
    this.data = options.data || {};
    this.assetName = options.assetName;
    if(this.assetName == "") {
      this.assetName = "index.html";
    }
  }

  apply(compiler:any) {
    var data = this.data;
    var assetName = this.assetName;

    compiler.plugin("emit", function(compilation:any, callback:Function) {
      let asset = compilation.assets[assetName];
      if(asset != undefined) {
        let templateContent = compilation.assets[assetName].source();
        let template = Handlebars.compile(templateContent);
        let result = template(data);
        compilation.assets[assetName] = {
          source: function() {
            return result;
          },
          size: function() {
            return result.length;
          }
        };
      }

      callback();
    });
  }
}
