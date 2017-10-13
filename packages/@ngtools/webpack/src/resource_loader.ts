import * as vm from 'vm';
import * as path from 'path';

const NodeTemplatePlugin = require('webpack/lib/node/NodeTemplatePlugin');
const NodeTargetPlugin = require('webpack/lib/node/NodeTargetPlugin');
const LoaderTargetPlugin = require('webpack/lib/LoaderTargetPlugin');
const SingleEntryPlugin = require('webpack/lib/SingleEntryPlugin');


interface CompilationOutput {
  outputName: string;
  source: string;
}

export class WebpackResourceLoader {
  private _parentCompilation: any;
  private _context: string;
  private _uniqueId = 0;
  private _resourceDependencies = new Map<string, string[]>();

  constructor() {}

  update(parentCompilation: any) {
    this._parentCompilation = parentCompilation;
    this._context = parentCompilation.context;
    this._uniqueId = 0;
  }

  getResourceDependencies(filePath: string) {
    return this._resourceDependencies.get(filePath) || [];
  }

  private _compile(filePath: string): Promise<CompilationOutput> {

    if (!this._parentCompilation) {
      throw new Error('WebpackResourceLoader cannot be used without parentCompilation');
    }

    const compilerName = `compiler(${this._uniqueId++})`;
    const outputOptions = { filename: filePath };
    const relativePath = path.relative(this._context || '', filePath);
    const childCompiler = this._parentCompilation.createChildCompiler(relativePath, outputOptions);
    childCompiler.context = this._context;
    childCompiler.apply(
      new NodeTemplatePlugin(outputOptions),
      new NodeTargetPlugin(),
      new SingleEntryPlugin(this._context, filePath),
      new LoaderTargetPlugin('node')
    );

    // Store the result of the parent compilation before we start the child compilation
    let assetsBeforeCompilation = Object.assign(
      {},
      this._parentCompilation.assets[outputOptions.filename]
    );

    // Fix for "Uncaught TypeError: __webpack_require__(...) is not a function"
    // Hot module replacement requires that every child compiler has its own
    // cache. @see https://github.com/ampedandwired/html-webpack-plugin/pull/179
    childCompiler.plugin('compilation', function (compilation: any) {
      if (compilation.cache) {
        if (!compilation.cache[compilerName]) {
          compilation.cache[compilerName] = {};
        }
        compilation.cache = compilation.cache[compilerName];
      }
    });

    // Compile and return a promise
    return new Promise((resolve, reject) => {
      childCompiler.runAsChild((err: Error, entries: any[], childCompilation: any) => {
        // Resolve / reject the promise
        if (childCompilation && childCompilation.errors && childCompilation.errors.length) {
          const errorDetails = childCompilation.errors.map(function (error: any) {
            return error.message + (error.error ? ':\n' + error.error : '');
          }).join('\n');
          reject(new Error('Child compilation failed:\n' + errorDetails));
        } else if (err) {
          reject(err);
        } else {
          // Replace [hash] placeholders in filename
          const outputName = this._parentCompilation.mainTemplate.applyPluginsWaterfall(
            'asset-path', outputOptions.filename, {
              hash: childCompilation.hash,
              chunk: entries[0]
            });

          // Restore the parent compilation to the state like it was before the child compilation.
          Object.keys(childCompilation.assets).forEach((fileName) => {
            // If it wasn't there and it's a source file (absolute path) - delete it.
            if (assetsBeforeCompilation[fileName] === undefined && path.isAbsolute(fileName)) {
              delete this._parentCompilation.assets[fileName];
            } else {
              // Otherwise, add it to the parent compilation.
              this._parentCompilation.assets[fileName] = childCompilation.assets[fileName];
            }
          });

          // Save the dependencies for this resource.
          this._resourceDependencies.set(outputName, childCompilation.fileDependencies);

          resolve({
            // Output name.
            outputName,
            // Compiled code.
            source: childCompilation.assets[outputName].source()
          });
        }
      });
    });
  }

  private _evaluate(output: CompilationOutput): Promise<string> {
    try {
      const outputName = output.outputName;
      const vmContext = vm.createContext(Object.assign({ require: require }, global));
      const vmScript = new vm.Script(output.source, { filename: outputName });

      // Evaluate code and cast to string
      let evaluatedSource: string;
      evaluatedSource = vmScript.runInContext(vmContext);

      if (typeof evaluatedSource == 'string') {
        return Promise.resolve(evaluatedSource);
      }

      return Promise.reject('The loader "' + outputName + '" didn\'t return a string.');
    } catch (e) {
      return Promise.reject(e);
    }
  }

  get(filePath: string): Promise<string> {
    return this._compile(filePath)
      .then((result: CompilationOutput) => this._evaluate(result));
  }
}
