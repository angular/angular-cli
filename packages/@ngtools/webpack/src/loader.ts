import * as path from 'path';
import * as ts from 'typescript';
import {AotPlugin} from './plugin';
import {TypeScriptFileRefactor} from './refactor';
import {LoaderContext, ModuleReason} from './webpack';

const loaderUtils = require('loader-utils');
const NormalModule = require('webpack/lib/NormalModule');


function _getContentOfKeyLiteral(_source: ts.SourceFile, node: ts.Node): string {
  if (!node) {
    return null;
  } else if (node.kind == ts.SyntaxKind.Identifier) {
    return (node as ts.Identifier).text;
  } else if (node.kind == ts.SyntaxKind.StringLiteral) {
    return (node as ts.StringLiteral).text;
  } else {
    return null;
  }
}


function _angularImportsFromNode(node: ts.ImportDeclaration, _sourceFile: ts.SourceFile): string[] {
  const ms = node.moduleSpecifier;
  let modulePath: string | null = null;
  switch (ms.kind) {
    case ts.SyntaxKind.StringLiteral:
      modulePath = (ms as ts.StringLiteral).text;
      break;
    default:
      return [];
  }

  if (!modulePath.startsWith('@angular/')) {
    return [];
  }

  if (node.importClause) {
    if (node.importClause.name) {
      // This is of the form `import Name from 'path'`. Ignore.
      return [];
    } else if (node.importClause.namedBindings) {
      const nb = node.importClause.namedBindings;
      if (nb.kind == ts.SyntaxKind.NamespaceImport) {
        // This is of the form `import * as name from 'path'`. Return `name.`.
        return [(nb as ts.NamespaceImport).name.text + '.'];
      } else {
        // This is of the form `import {a,b,c} from 'path'`
        const namedImports = nb as ts.NamedImports;

        return namedImports.elements
          .map((is: ts.ImportSpecifier) => is.propertyName ? is.propertyName.text : is.name.text);
      }
    }
  } else {
    // This is of the form `import 'path';`. Nothing to do.
    return [];
  }
}


function _ctorParameterFromTypeReference(paramNode: ts.ParameterDeclaration,
                                         angularImports: string[],
                                         refactor: TypeScriptFileRefactor) {
  let typeName = 'undefined';

  if (paramNode.type) {
    switch (paramNode.type.kind) {
      case ts.SyntaxKind.TypeReference:
        const type = paramNode.type as ts.TypeReferenceNode;
        if (type.typeName) {
          typeName = type.typeName.getText(refactor.sourceFile);
        } else {
          typeName = type.getText(refactor.sourceFile);
        }
        break;
      case ts.SyntaxKind.AnyKeyword:
        typeName = 'undefined';
        break;
      default:
        typeName = 'null';
    }
  }

  const decorators = refactor.findAstNodes(paramNode, ts.SyntaxKind.Decorator) as ts.Decorator[];
  const decoratorStr = decorators
    .map(decorator => {
      const call =
        refactor.findFirstAstNode(decorator, ts.SyntaxKind.CallExpression) as ts.CallExpression;

      if (!call) {
        return null;
      }

      const fnName = call.expression.getText(refactor.sourceFile);
      const args = call.arguments.map(x => x.getText(refactor.sourceFile)).join(', ');
      if (angularImports.indexOf(fnName) === -1) {
        return null;
      } else {
        return [fnName, args];
      }
    })
    .filter(x => !!x)
    .map(([name, args]: string[]) => {
      if (args) {
        return `{ type: ${name}, args: [${args}] }`;
      }
      return `{ type: ${name} }`;
    })
    .join(', ');

  if (decorators.length > 0) {
    return `{ type: ${typeName}, decorators: [${decoratorStr}] }`;
  }
  return `{ type: ${typeName} }`;
}


function _addCtorParameters(classNode: ts.ClassDeclaration,
                            angularImports: string[],
                            refactor: TypeScriptFileRefactor) {
  // For every classes with constructors, output the ctorParameters function which contains a list
  // of injectable types.
  const ctor = (
    refactor.findFirstAstNode(classNode, ts.SyntaxKind.Constructor) as ts.ConstructorDeclaration);
  if (!ctor) {
    // A class can be missing a constructor, and that's _okay_.
    return;
  }

  const params = Array.from(ctor.parameters).map(paramNode => {
    return _ctorParameterFromTypeReference(paramNode, angularImports, refactor);
  });

  const ctorParametersDecl = `static ctorParameters() { return [ ${params.join(', ')} ]; }`;
  refactor.prependBefore(classNode.getLastToken(refactor.sourceFile), ctorParametersDecl);
}


function _removeDecorators(refactor: TypeScriptFileRefactor) {
  const angularImports: string[]
    = refactor.findAstNodes(refactor.sourceFile, ts.SyntaxKind.ImportDeclaration)
      .map((node: ts.ImportDeclaration) => _angularImportsFromNode(node, refactor.sourceFile))
      .reduce((acc: string[], current: string[]) => acc.concat(current), []);

  // Find all decorators.
  refactor.findAstNodes(refactor.sourceFile, ts.SyntaxKind.Decorator)
    .forEach(node => {
      // First, add decorators to classes to the classes array.
      if (node.parent) {
        const declarations = refactor.findAstNodes(node.parent,
          ts.SyntaxKind.ClassDeclaration, false, 1);
        if (declarations.length > 0) {
          _addCtorParameters(declarations[0] as ts.ClassDeclaration, angularImports, refactor);
        }
      }

      refactor.findAstNodes(node, ts.SyntaxKind.CallExpression)
        .filter((node: ts.CallExpression) => {
          const fnName = node.expression.getText(refactor.sourceFile);
          if (fnName.indexOf('.') != -1) {
            // Since this is `a.b`, see if it's the same namespace as a namespace import.
            return angularImports.indexOf(fnName.replace(/\..*$/, '') + '.') != -1;
          } else {
            return angularImports.indexOf(fnName) != -1;
          }
        })
        .forEach(() => refactor.removeNode(node));
    });
}


function _replaceBootstrap(plugin: AotPlugin, refactor: TypeScriptFileRefactor) {
  // If bootstrapModule can't be found, bail out early.
  if (!refactor.sourceMatch(/\bbootstrapModule\b/)) {
    return;
  }

  // Calculate the base path.
  const basePath = path.normalize(plugin.basePath);
  const genDir = path.normalize(plugin.genDir);
  const dirName = path.normalize(path.dirname(refactor.fileName));
  const entryModule = plugin.entryModule;
  const entryModuleFileName = path.normalize(entryModule.path + '.ngfactory');
  const relativeEntryModulePath = path.relative(basePath, entryModuleFileName);
  const fullEntryModulePath = path.resolve(genDir, relativeEntryModulePath);
  const relativeNgFactoryPath = path.relative(dirName, fullEntryModulePath);
  const ngFactoryPath = './' + relativeNgFactoryPath.replace(/\\/g, '/');

  const allCalls = refactor.findAstNodes(refactor.sourceFile,
    ts.SyntaxKind.CallExpression, true) as ts.CallExpression[];

  const bootstraps = allCalls
    .filter(call => call.expression.kind == ts.SyntaxKind.PropertyAccessExpression)
    .map(call => call.expression as ts.PropertyAccessExpression)
    .filter(access => {
      return access.name.kind == ts.SyntaxKind.Identifier
          && access.name.text == 'bootstrapModule';
    });

  const calls: ts.CallExpression[] = bootstraps
    .reduce((previous, access) => {
      const expressions
        = refactor.findAstNodes(access, ts.SyntaxKind.CallExpression, true) as ts.CallExpression[];
      return previous.concat(expressions);
    }, [])
    .filter((call: ts.CallExpression) => {
      return call.expression.kind == ts.SyntaxKind.Identifier
          && (call.expression as ts.Identifier).text == 'platformBrowserDynamic';
    });

  if (calls.length == 0) {
    // Didn't find any dynamic bootstrapping going on.
    return;
  }

  // Create the changes we need.
  allCalls
    .filter(call => bootstraps.some(bs => bs == call.expression))
    .forEach((call: ts.CallExpression) => {
      refactor.replaceNode(call.arguments[0], entryModule.className + 'NgFactory');
    });

  calls.forEach(call => refactor.replaceNode(call.expression, 'platformBrowser'));

  bootstraps
    .forEach((bs: ts.PropertyAccessExpression) => {
      // This changes the call.
      refactor.replaceNode(bs.name, 'bootstrapModuleFactory');
    });

  refactor.insertImport('platformBrowser', '@angular/platform-browser');
  refactor.insertImport(entryModule.className + 'NgFactory', ngFactoryPath);
}

export function removeModuleIdOnlyForTesting(refactor: TypeScriptFileRefactor) {
  _removeModuleId(refactor);
}

function _removeModuleId(refactor: TypeScriptFileRefactor) {
  const sourceFile = refactor.sourceFile;

  refactor.findAstNodes(sourceFile, ts.SyntaxKind.ObjectLiteralExpression, true)
    // Get all their property assignments.
    .filter((node: ts.ObjectLiteralExpression) => {
      return node.properties.some(prop => {
        return prop.kind == ts.SyntaxKind.PropertyAssignment
            && _getContentOfKeyLiteral(sourceFile, prop.name) == 'moduleId';
      });
    })
    .forEach((node: ts.ObjectLiteralExpression) => {
      const moduleIdProp = node.properties.filter((prop: ts.ObjectLiteralElement, _idx: number) => {
        return prop.kind == ts.SyntaxKind.PropertyAssignment
            && _getContentOfKeyLiteral(sourceFile, prop.name) == 'moduleId';
      })[0];
      // get the trailing comma
      const moduleIdCommaProp = moduleIdProp.parent.getChildAt(1).getChildren()[1];
      refactor.removeNodes(moduleIdProp, moduleIdCommaProp);
    });
}

function _getResourceRequest(element: ts.Expression, sourceFile: ts.SourceFile) {
  if (element.kind == ts.SyntaxKind.StringLiteral) {
    const url = (element as ts.StringLiteral).text;
    // If the URL does not start with ./ or ../, prepends ./ to it.
    return `'${/^\.?\.\//.test(url) ? '' : './'}${url}'`;
  } else {
    // if not string, just use expression directly
    return element.getFullText(sourceFile);
  }
}

function _replaceResources(refactor: TypeScriptFileRefactor): void {
  const sourceFile = refactor.sourceFile;

  // Find all object literals.
  refactor.findAstNodes(sourceFile, ts.SyntaxKind.ObjectLiteralExpression, true)
    // Get all their property assignments.
    .map(node => refactor.findAstNodes(node, ts.SyntaxKind.PropertyAssignment))
    // Flatten into a single array (from an array of array<property assignments>).
    .reduce((prev, curr) => curr ? prev.concat(curr) : prev, [])
    // Remove every property assignment that aren't 'loadChildren'.
    .filter((node: ts.PropertyAssignment) => {
      const key = _getContentOfKeyLiteral(sourceFile, node.name);
      if (!key) {
        // key is an expression, can't do anything.
        return false;
      }
      return key == 'templateUrl' || key == 'styleUrls';
    })
    // Get the full text of the initializer.
    .forEach((node: ts.PropertyAssignment) => {
      const key = _getContentOfKeyLiteral(sourceFile, node.name);

      if (key == 'templateUrl') {
        refactor.replaceNode(node,
          `template: require(${_getResourceRequest(node.initializer, sourceFile)})`);
      } else if (key == 'styleUrls') {
        const arr = <ts.ArrayLiteralExpression[]>(
          refactor.findAstNodes(node, ts.SyntaxKind.ArrayLiteralExpression, false));
        if (!arr || arr.length == 0 || arr[0].elements.length == 0) {
          return;
        }

        const initializer = arr[0].elements.map((element: ts.Expression) => {
          return _getResourceRequest(element, sourceFile);
        });
        refactor.replaceNode(node, `styles: [require(${initializer.join('), require(')})]`);
      }
    });
}


/**
 * Recursively calls diagnose on the plugins for all the reverse dependencies.
 * @private
 */
function _diagnoseDeps(reasons: ModuleReason[], plugin: AotPlugin, checked: Set<string>) {
  reasons
    .filter(reason => reason && reason.module && reason.module instanceof NormalModule)
    .filter(reason => !checked.has(reason.module.resource))
    .forEach(reason => {
      checked.add(reason.module.resource);
      plugin.diagnose(reason.module.resource);
      _diagnoseDeps(reason.module.reasons, plugin, checked);
    });
}


// Super simple TS transpiler loader for testing / isolated usage. does not type check!
export function ngcLoader(this: LoaderContext & { _compilation: any }) {
  const cb = this.async();
  const sourceFileName: string = this.resourcePath;

  const plugin = this._compilation._ngToolsWebpackPluginInstance as AotPlugin;
  // We must verify that AotPlugin is an instance of the right class.
  if (plugin && plugin instanceof AotPlugin) {
    const refactor = new TypeScriptFileRefactor(
      sourceFileName, plugin.compilerHost, plugin.program);

    Promise.resolve()
      .then(() => {
        if (!plugin.skipCodeGeneration) {
          return Promise.resolve()
            .then(() => _removeDecorators(refactor))
            .then(() => _replaceBootstrap(plugin, refactor));
        } else {
          return Promise.resolve()
            .then(() => _replaceResources(refactor))
            .then(() => _removeModuleId(refactor));
        }
      })
      .then(() => {
        if (plugin.typeCheck) {
          // Check all diagnostics from this and reverse dependencies also.
          if (!plugin.firstRun) {
            _diagnoseDeps(this._module.reasons, plugin, new Set<string>());
          }
          // We do this here because it will throw on error, resulting in rebuilding this file
          // the next time around if it changes.
          plugin.diagnose(sourceFileName);
        }
      })
      .then(() => {
        // Force a few compiler options to make sure we get the result we want.
        const compilerOptions: ts.CompilerOptions = Object.assign({}, plugin.compilerOptions, {
          inlineSources: true,
          inlineSourceMap: false,
          sourceRoot: plugin.basePath
        });

        const result = refactor.transpile(compilerOptions);
        cb(null, result.outputText, result.sourceMap);
      })
      .catch(err => cb(err));
  } else {
    const options = loaderUtils.getOptions(this) || {};
    const tsConfigPath = options.tsConfigPath;
    const tsConfig = ts.readConfigFile(tsConfigPath, ts.sys.readFile);

    if (tsConfig.error) {
      throw tsConfig.error;
    }

    const compilerOptions: ts.CompilerOptions = tsConfig.config.compilerOptions;
    for (const key of Object.keys(options)) {
      if (key == 'tsConfigPath') {
        continue;
      }
      compilerOptions[key] = options[key];
    }
    const compilerHost = ts.createCompilerHost(compilerOptions);
    const refactor = new TypeScriptFileRefactor(sourceFileName, compilerHost);
    _replaceResources(refactor);

    const result = refactor.transpile(compilerOptions);
    // Webpack is going to take care of this.
    result.outputText = result.outputText.replace(/^\/\/# sourceMappingURL=[^\r\n]*/gm, '');
    cb(null, result.outputText, result.sourceMap);
  }
}
