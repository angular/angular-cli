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

export function createCodeGenerator({ngcOptions, i18nOptions, resourceLoader, compilerHost}){

  return program => new Observable<{fileName:string, sourceText: string}>(codegenOutput => {
    //emit files from observable monkeypatch
    const writeFile = compilerHost.writeFile;

    compilerHost.writeFile = (fileName, sourceText) => {
      writeFile(fileName, sourceText);
      codegenOutput.next({fileName, sourceText});
    };
    const codeGenerator = ngCompiler.CodeGenerator.create(
      ngcOptions,
      i18nOptions,
      program,
      compilerHost,
      undefined, //TODO: hook in reflector host context
      resourceLoader
    );

    codeGenerator
      .codegen().then(
        () => {
          codegenOutput.complete();
        },
        err => codegenOutput.error(err)
      );
  });
}
