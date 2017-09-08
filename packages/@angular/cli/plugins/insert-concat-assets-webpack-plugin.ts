// Add assets from `ConcatPlugin` to index.html.
import * as path from 'path';

export class InsertConcatAssetsWebpackPlugin {
  // Priority list of where to insert asset.
  private insertAfter = [
    /polyfills(\.[0-9a-f]{20})?\.bundle\.js/,
    /inline(\.[0-9a-f]{20})?\.bundle\.js/,
  ];

  constructor(private entryNames: string[]) { }

  apply(compiler: any): void {
    compiler.plugin('compilation', (compilation: any) => {
      compilation.plugin('html-webpack-plugin-before-html-generation',
        (htmlPluginData: any, callback: any) => {

          const fileNames = this.entryNames.map((entryName) => {
            const fileName = htmlPluginData.assets.webpackConcat
              && htmlPluginData.assets.webpackConcat[entryName];

            if (!fileName) {
              // Something went wrong and the asset was not correctly added.
              throw new Error(`Cannot find file for ${entryName} script.`);
            }

            return path.join(htmlPluginData.assets.publicPath, fileName);
          });

          let insertAt = 0;

          // TODO: try to figure out if there are duplicate bundle names when adding and throw
          for (let el of this.insertAfter) {
            const jsIdx = htmlPluginData.assets.js.findIndex((js: string) => js.match(el));
            if (jsIdx !== -1) {
              insertAt = jsIdx + 1;
              break;
            }
          }

          htmlPluginData.assets.js.splice(insertAt, 0, ...fileNames);
          callback(null, htmlPluginData);
        });
    });
  }
}
