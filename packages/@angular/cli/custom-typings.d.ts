// tslint:disable:no-any
declare module 'yargs-parser' {
  const parseOptions: any;
  const yargsParser: <T = any>(args: string | string[], options?: parseOptions) => T;
  export = yargsParser;
}
