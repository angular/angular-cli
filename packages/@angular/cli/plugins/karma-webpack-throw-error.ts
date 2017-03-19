// Force Webpack to throw compilation errors. Useful with karma-webpack when in single-run mode.
// Workaround for https://github.com/webpack-contrib/karma-webpack/issues/66

export class KarmaWebpackThrowError {
  constructor() { }

  apply(compiler: any): void {
    compiler.plugin('done', (stats: any) => {
      if (stats.compilation.errors.length > 0) {
        throw new Error(stats.compilation.errors.map((err: any) => err.message || err));
      }
    });
  }
}
