// ExtractTextPlugin leaves behind the entry points, which we might not need anymore
// if they were entirely css. This plugin removes those entry points.

export interface SuppressEntryChunksWebpackPluginOptions {
  chunks: string[];
}

export class SuppressEntryChunksWebpackPlugin {
  constructor(private options: SuppressEntryChunksWebpackPluginOptions) { }

  apply(compiler: any): void {
    let { chunks } = this.options;
    compiler.plugin('compilation', function (compilation: any) {
      // Remove the js file for supressed chunks
      compilation.plugin('after-seal', (callback: any) => {
        compilation.chunks
          .filter((chunk: any) => chunks.indexOf(chunk.name) !== -1)
          .forEach((chunk: any) => {
            let newFiles: string[] = [];
            chunk.files.forEach((file: string) => {
              if (file.match(/\.js$/)) {
                // remove js files
                delete compilation.assets[file];
              } else {
                newFiles.push(file);
              }
            });
            chunk.files = newFiles;
          });
        callback();
      });
      // Remove scripts tags with a css file as source, because HtmlWebpackPlugin will use
      // a css file as a script for chunks without js files.
      compilation.plugin('html-webpack-plugin-alter-asset-tags',
        (htmlPluginData: any, callback: any) => {
          const filterFn = (tag: any) =>
            !(tag.tagName === 'script' && tag.attributes.src.match(/\.css$/));
          htmlPluginData.head = htmlPluginData.head.filter(filterFn);
          htmlPluginData.body = htmlPluginData.body.filter(filterFn);
          callback(null, htmlPluginData);
        });
    });
  }
}
