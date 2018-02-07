// tslint:disable
// TODO: cleanup this file, it's copied as is from Angular CLI.

export class StaticAssetPlugin {

  constructor(private name: string, private contents: string) {}

  apply(compiler: any): void {
    compiler.plugin('emit', (compilation: any, cb: Function) => {
      compilation.assets[this.name] = {
        size: () => this.contents.length,
        source: () => this.contents,
      };
      cb();
    });
  }
}
