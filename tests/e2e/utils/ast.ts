import {
  insertImport as _insertImport,
  addImportToModule as _addImportToModule
} from '@angular-cli/ast-tools';


export function insertImport(file: string, symbol: string, module: string) {
  return _insertImport(file, symbol, module).apply();
}

export function addImportToModule(file: string, symbol: string, module: string) {
  return _addImportToModule(file, symbol, module);
}
