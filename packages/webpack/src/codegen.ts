import {Observable} from 'rxjs/Rx'
import * as ts from 'typescript'
import * as ngCompiler from '@angular/compiler-cli'
import * as tscWrapped from '@angular/tsc-wrapped'
import * as tsc from '@angular/tsc-wrapped/src/tsc'
import * as path from 'path'
import * as fs from 'fs'

export interface CodeGenOptions {
  program: ts.Program;
  ngcOptions: any;
  i18nOptions: any;
  resourceLoader?:any; //impl of ResourceLoader
  compilerHost: any;
}

function _readConfig(tsConfigPath){
    let {config, error} = ts.readConfigFile(tsConfigPath, ts.sys.readFile);
    if(error){
      throw error;
    }
    return config;
  }

export function createCodeGenerator({ngcOptions, i18nOptions, resourceLoader, compilerHost, reflectorHostContext}){



  return (program:ts.Program) => new Observable<{fileName:string, sourceText: string}>(codegenOutput => {
    //emit files from observable monkeypatch
    const writeFile = compilerHost.writeFile;

    program.getSourceFiles().forEach(f => console.log(f.fileName))
    console.log(program.getCompilerOptions())

    compilerHost.writeFile = (fileName, sourceText) => {
      writeFile(fileName, sourceText);
      codegenOutput.next({fileName, sourceText});
    };

    const codeGenerator = ngCompiler.CodeGenerator.create(
      ngcOptions,
      i18nOptions,
      program,
      compilerHost,
      reflectorHostContext, //TODO: hook in reflector host
      undefined
    );

    codeGenerator
      .codegen().then(
        () => {
          program.emit()
          codegenOutput.complete();
        },
        err => codegenOutput.error(err)
      );
  });
}
