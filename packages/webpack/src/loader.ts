import * as path from 'path';
import * as ts from 'typescript';
import {AotPlugin} from './plugin';
import {MultiChange, ReplaceChange, insertImport} from '@angular-cli/ast-tools';

// TODO: move all this to ast-tools.
function _findNodes(sourceFile: ts.SourceFile, node: ts.Node, kind: ts.SyntaxKind,
                    keepGoing = false): ts.Node[] {
  if (node.kind == kind && !keepGoing) {
    return [node];
  }

  return node.getChildren(sourceFile).reduce((result, n) => {
    return result.concat(_findNodes(sourceFile, n, kind, keepGoing));
  }, node.kind == kind ? [node] : []);
}

function _removeDecorators(fileName: string, source: string): string {
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest);
  // Find all decorators.
  const decorators = _findNodes(sourceFile, sourceFile, ts.SyntaxKind.Decorator);
  decorators.sort((a, b) => b.pos - a.pos);

  decorators.forEach(d => {
    source = source.slice(0, d.pos) + source.slice(d.end);
  });

  return source;
}


function _replaceBootstrap(fileName: string,
                           source: string,
                           plugin: AotPlugin): Promise<string> {
  // If bootstrapModule can't be found, bail out early.
  if (!source.match(/\bbootstrapModule\b/)) {
    return Promise.resolve(source);
  }

  let changes = new MultiChange();

  // Calculate the base path.
  const basePath = path.normalize(plugin.basePath);
  const genDir = path.normalize(plugin.genDir);
  const dirName = path.normalize(path.dirname(fileName));
  const entryModule = plugin.entryModule;
  const entryModuleFileName = path.normalize(entryModule.path + '.ngfactory');
  const relativeEntryModulePath = path.relative(basePath, entryModuleFileName);
  const fullEntryModulePath = path.resolve(genDir, relativeEntryModulePath);
  const relativeNgFactoryPath = path.relative(dirName, fullEntryModulePath);
  const ngFactoryPath = './' + relativeNgFactoryPath.replace(/\\/g, '/');

  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest);

  const allCalls = _findNodes(
    sourceFile, sourceFile, ts.SyntaxKind.CallExpression, true) as ts.CallExpression[];

  const bootstraps = allCalls
    .filter(call => call.expression.kind == ts.SyntaxKind.PropertyAccessExpression)
    .map(call => call.expression as ts.PropertyAccessExpression)
    .filter(access => {
      return access.name.kind == ts.SyntaxKind.Identifier
          && access.name.text == 'bootstrapModule';
    });

  const calls: ts.Node[] = bootstraps
    .reduce((previous, access) => {
      return previous.concat(_findNodes(sourceFile, access, ts.SyntaxKind.CallExpression, true));
    }, [])
    .filter(call => {
      return call.expression.kind == ts.SyntaxKind.Identifier
          && call.expression.text == 'platformBrowserDynamic';
    });

  if (calls.length == 0) {
    // Didn't find any dynamic bootstrapping going on.
    return Promise.resolve(source);
  }

  // Create the changes we need.
  allCalls
    .filter(call => bootstraps.some(bs => bs == call.expression))
    .forEach((call: ts.CallExpression) => {
      changes.appendChange(new ReplaceChange(fileName, call.arguments[0].getStart(sourceFile),
        entryModule.className, entryModule.className + 'NgFactory'));
    });

  calls
    .forEach(call => {
      changes.appendChange(new ReplaceChange(fileName, call.getStart(sourceFile),
        'platformBrowserDynamic', 'platformBrowser'));
    });

  bootstraps
    .forEach((bs: ts.PropertyAccessExpression) => {
      // This changes the call.
      changes.appendChange(new ReplaceChange(fileName, bs.name.getStart(sourceFile),
        'bootstrapModule', 'bootstrapModuleFactory'));
    });
  changes.appendChange(insertImport(fileName, 'platformBrowser', '@angular/platform-browser'));
  changes.appendChange(insertImport(fileName, entryModule.className + 'NgFactory', ngFactoryPath));

  let sourceText = source;
  return changes.apply({
    read: (path: string) => Promise.resolve(sourceText),
    write: (path: string, content: string) => Promise.resolve(sourceText = content)
  }).then(() => sourceText);
}

function _transpile(plugin: AotPlugin, filePath: string, sourceText: string) {
  const program = plugin.program;
  if (plugin.typeCheck) {
    const sourceFile = program.getSourceFile(filePath);
    const diagnostics = program.getSyntacticDiagnostics(sourceFile)
                .concat(program.getSemanticDiagnostics(sourceFile))
                .concat(program.getDeclarationDiagnostics(sourceFile));

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

  const result = ts.transpileModule(sourceText, {
    compilerOptions: plugin.compilerOptions,
    fileName: filePath
  });

  return {
    outputText: result.outputText,
    sourceMap: JSON.parse(result.sourceMapText)
  };
}

// Super simple TS transpiler loader for testing / isolated usage. does not type check!
export function ngcLoader(source: string) {
  this.cacheable();

  const plugin = this._compilation._ngToolsWebpackPluginInstance as AotPlugin;
  // We must verify that AotPlugin is an instance of the right class.
  if (plugin && plugin instanceof AotPlugin) {
    const cb: any = this.async();

    plugin.done
      .then(() => _removeDecorators(this.resource, source))
      .then(sourceText => _replaceBootstrap(this.resource, sourceText, plugin))
      .then(sourceText => {
        const result = _transpile(plugin, this.resource, sourceText);
        cb(null, result.outputText, result.sourceMap);
      })
      .catch(err => cb(err));
  } else {
    return ts.transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES5,
        module: ts.ModuleKind.ES2015,
      }
    }).outputText;
  }
}
