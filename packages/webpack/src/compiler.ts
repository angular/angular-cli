import * as tscWrapped from '@angular/tsc-wrapped/src/compiler_host';
import * as ts from 'typescript';


export class NgcWebpackCompilerHost extends tscWrapped.DelegatingHost {
  fileCache = new Map<string, string>();

  constructor(delegate: ts.CompilerHost) {
    super(delegate);
  }
}

export function createCompilerHost(tsConfig: any) {
  const delegateHost = ts.createCompilerHost(tsConfig['compilerOptions']);
  return new NgcWebpackCompilerHost(delegateHost);
}
