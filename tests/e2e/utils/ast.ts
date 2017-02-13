import {
  insertImport as _insertImport,
  addImportToModule as _addImportToModule,
  NodeHost
} from '../../../packages/@angular/cli/lib/ast-tools';


export function insertImport(file: string, symbol: string, module: string) {
  return _insertImport(file, symbol, module)
    .then(change => change.apply(NodeHost));
}

export function addImportToModule(file: string, symbol: string, module: string) {
  return _addImportToModule(file, symbol, module)
    .then(change => change.apply(NodeHost));
}
