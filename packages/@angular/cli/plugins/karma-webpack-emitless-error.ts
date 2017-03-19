// Don't emit anything when there are compilation errors. This is useful for preventing Karma
// from re-running tests when there is a compilation error.
// Workaround for https://github.com/webpack-contrib/karma-webpack/issues/49

export class KarmaWebpackEmitlessError {
  constructor() { }

  apply(compiler: any): void {
    compiler.plugin('done', (stats: any) => {
      if (stats.compilation.errors.length > 0) {
        stats.stats = [{
          toJson: function () {
            return this;
          },
          assets: []
        }];
      }
    });
  }
}
