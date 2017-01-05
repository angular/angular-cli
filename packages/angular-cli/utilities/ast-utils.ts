// In order to keep refactoring low, simply export from ast-tools.
// TODO: move all dependencies of this file to ast-tools directly.
export {
  getSource,
  getSourceNodes,
  findNodes,
  insertAfterLastOccurrence,
  getContentOfKeyLiteral,
  getDecoratorMetadata,
  addDeclarationToModule,
  addProviderToModule,
  addExportToModule
} from '@angular-cli/ast-tools';
