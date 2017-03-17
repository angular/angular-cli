// replace with the real thing when PR is merged
// https://github.com/angular/universal/pull/464

export interface IWebpackPrerender {
  templatePath: string;
  configPath: string;
  appPath: string;
}

export class PrerenderWebpackPlugin {

  private bootloader: any;
  private cachedTemplate: string;

  constructor(private options: IWebpackPrerender) {
    // maintain your platform instance
    this.bootloader = require(this.options.configPath).getBootloader();
  }

  apply(compiler: any) {
    compiler.plugin('emit', (compilation: any, callback: Function) => {
      if (compilation.assets.hasOwnProperty(this.options.templatePath)) {
        // we need to cache the template file to be able to re-serialize it
        // even when it is not being emitted
        this.cachedTemplate = compilation.assets[this.options.templatePath].source();
      }

      if (this.cachedTemplate) {
        this.decacheAppFiles();
        require(this.options.configPath).serialize(this.bootloader, this.cachedTemplate)
          .then((html: string) => {
            compilation.assets[this.options.templatePath] = {
              source: () => html,
              size: () => html.length
            };
            callback();
          });
      } else {
        callback();
      }
    });
  }

  decacheAppFiles() {
    // delete all app files from cache, but keep libs
    // this is needed so that the config file can reimport up to date
    // versions of the app files
    delete require.cache[this.options.configPath];
    Object.keys(require.cache)
      .filter(key => key.startsWith(this.options.appPath))
      .forEach(function (key) {
        // console.log('===', key);
        delete require.cache[key];
      });
  }
};
