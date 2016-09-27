//super simple TS transpiler loader for testing / isolated usage. does not type check!
import * as path from 'path'
import * as fs from 'fs'
import * as ts from 'typescript'

export function ngcLoader(sourceFile){

  return ts.transpileModule(sourceFile, {compilerOptions: {target: ts.ScriptTarget.ES5, module: ts.ModuleKind.ES2015}}).outputText;
}
