

export interface IUniversalPrerender {
}

export class UniversalPrerender {
  constructor(_options: IWebpackPrerender) {
  }

  apply(compiler) {
    compiler.plugin('emit', (_compilation, _callback) => {
      return '';
    });
  }
}
