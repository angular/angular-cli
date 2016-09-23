import * as ngCompiler from '@angular/compiler-cli'
import * as tscWrapped from '@angular/tsc-wrapped/src/compiler_host'
import * as ts from 'typescript'


export class NgcWebpackCompilerHost extends tscWrapped.DelegatingHost {
  fileCache:Map<string,string> = new Map<string, string> ()
  constructor(delegate: ts.CompilerHost){
    super(delegate);

  }


    clearCache(){
      this.fileCache = new Map();
    }
}

export function createCompilerHost(tsConfig){
  const delegateHost = ts.createCompilerHost(tsConfig.compilerOptions);
  return new NgcWebpackCompilerHost(delegateHost);
}
