import * as path from 'path';
import * as ts from 'typescript';
import {AotPlugin} from './plugin';
import {TypeScriptFileRefactor} from './refactor';

const loaderUtils = require('loader-utils');


function _getContentOfKeyLiteral(source: ts.SourceFile, node: ts.Node): string {
  if (node.kind == ts.SyntaxKind.Identifier) {
    return (node as ts.Identifier).text;
  } else if (node.kind == ts.SyntaxKind.StringLiteral) {
    return (node as ts.StringLiteral).text;
  } else {
    return null;
  }
}

function _removeDecorators(refactor: TypeScriptFileRefactor) {
  // TODO: replace this by tsickle.
  // Find all decorators.
  // refactor.findAstNodes(refactor.sourceFile, ts.SyntaxKind.Decorator)
  //   .forEach(d => refactor.removeNode(d));
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
    .filter((node: ts.ObjectLiteralExpression) =>
      node.properties.some(prop => prop.name.getText() == 'moduleId'))
    .forEach((node: ts.ObjectLiteralExpression) => {
      const moduleIdProp = node.properties.filter((prop: ts.ObjectLiteralElement, idx: number) => {
        return prop.name.getText() == 'moduleId';
      })[0];
      // get the trailing comma
      const moduleIdCommaProp = moduleIdProp.parent.getChildAt(1).getChildren()[1];
      refactor.removeNodes(moduleIdProp, moduleIdCommaProp);
    });
}

function _getResourceRequest(element: ts.Expression, sourceFile: ts.SourceFile) {
  if (element.kind == ts.SyntaxKind.StringLiteral) {
    // if string, assume relative path unless it start with /
    return `'${loaderUtils.urlToRequest((element as ts.StringLiteral).text, '')}'`;
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


function _checkDiagnostics(refactor: TypeScriptFileRefactor) {
  const diagnostics = refactor.getDiagnostics();

  if (diagnostics.length > 0) {
    const message = diagnostics
      .map(diagnostic => {
        const {line, character} = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
        const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
        return `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message})`;
      })
      .join('\n');
    throw new Error(message);
  }
}


// Super simple TS transpiler loader for testing / isolated usage. does not type check!
export function ngcLoader(source: string) {
  this.cacheable();
  const cb: any = this.async();
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
          _checkDiagnostics(refactor);
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
    const options = loaderUtils.parseQuery(this.query);
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
