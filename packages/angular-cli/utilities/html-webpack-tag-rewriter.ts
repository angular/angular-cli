interface HtmlPluginData {
  body: Array<{
    tagName: string,
    attributes: {
      [key: string]: any
    }
  }>;
}

/**
 * Add async tag to all scripts in the body of the page:
 * <script async="true" src="main.bundle.js"></script>
 */
export function htmlWebpackTagRewriter () {
  this.plugin('compilation', (compilation: any) => {
    compilation.plugin('html-webpack-plugin-alter-asset-tags', (htmlPluginData: HtmlPluginData,
        callback: Function) => {
      htmlPluginData.body
        .filter(t => t.tagName === 'script')
        .forEach(t => {
          t.attributes['async'] = true;
        });
      callback();
    });
  });
}
