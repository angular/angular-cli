// In order to keep refactoring low, simply export from ast-tools.
// TODO: move all dependencies of this file to ast-tools directly.
export {
  bootstrapItem,
  insertImport,
  addPathToRoutes,
  addItemsToRouteProperties,
  confirmComponentExport,
  resolveComponentPath,
  applyChanges
} from '@angular-cli/ast-tools';
