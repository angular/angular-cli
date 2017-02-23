export interface BaseHrefWebpackPluginOptions {
  baseHref: string;
}

export class BaseHrefWebpackPlugin {
  constructor(public readonly options: BaseHrefWebpackPluginOptions) { }

  apply(compiler: any): void {
    // Ignore if baseHref is not passed
    if (!this.options.baseHref) {
      return;
    }

    compiler.plugin('compilation', (compilation: any) => {
      compilation.plugin(
        'html-webpack-plugin-before-html-processing',
        (htmlPluginData: any, callback: Function) => {
          // Check if base tag already exists
          const baseTagRegex = /<base.*?>/i;
          const baseTagMatches = htmlPluginData.html.match(baseTagRegex);
          if (!baseTagMatches) {
            // Insert it in top of the head if not exist
            htmlPluginData.html = htmlPluginData.html.replace(
              /<head>/i, '$&' + `<base href="${this.options.baseHref}">`
            );
          } else {
            // Replace only href attribute if exists
            const modifiedBaseTag = baseTagMatches[0].replace(
              /href="\S+"/i, `href="${this.options.baseHref}"`
            );
            htmlPluginData.html = htmlPluginData.html.replace(baseTagRegex, modifiedBaseTag);
          }

          callback(null, htmlPluginData);
        }
      );
    });
  }
}
