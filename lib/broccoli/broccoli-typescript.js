'use strict';

const Plugin = require('broccoli-caching-writer');
const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const ts = require('typescript');
const glob = require('glob');

const FS_OPTS = {
  encoding: 'utf-8'
};


/**
 * Broccoli plugin that implements incremental Typescript compiler.
 *
 * It instantiates a typescript compiler instance that keeps all the state about the project and
 * can re-emit only the files that actually changed.
 *
 * Limitations: only files that map directly to the changed source file via naming conventions are
 * re-emitted. This primarily affects code that uses `const enum`s, because changing the enum value
 * requires global emit, which can affect many files.
 */
class BroccoliTypeScriptCompiler extends Plugin {
  constructor(inputPath, tsConfigPath, options) {
    super([inputPath], {});

    this._fileRegistry = Object.create(null);
    this._rootFilePaths = [];
    this._tsOpts = null;
    this._tsServiceHost = null;
    this._tsService = null;

    this._tsConfigPath = tsConfigPath;
    this._options = options;
  }

  build() {
    if (!this._tsServiceHost) {
      this._createServiceHost();
    }
    this._doIncrementalBuild();
  }

  _doIncrementalBuild() {
    var errorMessages = [];
    var entries = this.listEntries();
    const inputPath = this.inputPaths[0];

    const pathsToEmit = [];

    entries.forEach(entry => {
      const tsFilePath = path.join(inputPath, entry.relativePath);
      if (!tsFilePath.match(/\.ts$/) || !fs.existsSync(tsFilePath)) {
        return;
      }
      // Remove d.ts files that aren't part of the tsconfig files.
      if (tsFilePath.match(/\.d\.ts$/) && this._tsConfigFiles.indexOf(tsFilePath) == -1) {
        return;
      }

      if (!this._fileRegistry[tsFilePath]) {
        // Not in the registry? Add it.
        this._addNewFileEntry(entry);

        // We need to add the file to the rootFiles as well, as otherwise it _might_
        // not get compiled. It needs to be referenced at some point, and unless we
        // add the spec files first (which we don't know the order), it won't.
        // So make every new files an entry point instead.
        // TODO(hansl): We need to investigate if we should emit files that are not
        //              referenced. This doesn't take that into account.
        this._tsServiceHost.fileNames.push(tsFilePath);

        pathsToEmit.push(tsFilePath);
      } else if (this._fileRegistry[tsFilePath].version >= entry.mtime) {
        // Nothing to do for this file. Just link the cached outputs.
        this._fileRegistry[tsFilePath].outputs.forEach(absoluteFilePath => {
          const outputFilePath = absoluteFilePath.replace(this.cachePath, this.outputPath);
          fse.mkdirsSync(path.dirname(outputFilePath));
          try {
            fs.symlinkSync(absoluteFilePath, outputFilePath);
          } catch (e) {
            const contentStr = fs.readFileSync(absoluteFilePath);
            fs.writeFileSync(outputFilePath, contentStr);
          }
        });
      } else {
        this._fileRegistry[tsFilePath].version = entry.mtime;
        pathsToEmit.push(tsFilePath);
      }
    });

    if (pathsToEmit.length > 0) {
      // Force the TS Service to recreate the program (ie. call synchronizeHostData).
      this._tsServiceHost.projectVersion++;

      pathsToEmit.forEach(tsFilePath => {
        var output = this._tsService.getEmitOutput(tsFilePath);
        if (output.emitSkipped) {
          const allDiagnostics = this._tsService.getCompilerOptionsDiagnostics()
            .concat(this._tsService.getSyntacticDiagnostics(tsFilePath))
            .concat(this._tsService.getSemanticDiagnostics(tsFilePath));

          const errors = this._collectErrors(allDiagnostics);
          if (errors) {
            // Rebuild it next incremental pass.
            delete this._fileRegistry[tsFilePath];
            errorMessages.push(errors);
          }
        } else {
          output.outputFiles.forEach(o => {
            this._outputFile(o.name, o.text, this._fileRegistry[tsFilePath]);
          });
        }
      });
    }

    if (errorMessages.length) {
      var error = new Error('Typescript found the following errors:\n' + errorMessages.join('\n'));
      error['showStack'] = false;
      throw error;
    }
  }

  _loadTsConfig() {
    var tsConfigPath = path.join(this.inputPaths[0], this._tsConfigPath);
    var tsconfig = JSON.parse(fs.readFileSync(tsConfigPath, 'utf-8'));

    tsconfig.files = (tsconfig.files || [])
      .map(name => path.join(path.dirname(this._tsConfigPath), name));

    // Add all glob files to files. In some cases we don't want to specify
    let globFiles = this._options.additionalFiles;
    if (globFiles) {
      if (typeof globFiles == 'string') {
        globFiles = [globFiles];
      }

      for (const g of globFiles) {
        const files = glob(g, { sync: true, cwd: this.inputPaths[0], root: this.inputPaths[0] });
        tsconfig.files = tsconfig.files.concat(files);
      }
    }

    // Remove dupes in tsconfig.files.
    const fileNameMap = {};
    tsconfig.files = tsconfig.files.filter(fileName => {
      if (fileNameMap[fileName]) {
        return false;
      }
      fileNameMap[fileName] = true;
      return true;
    });

    // Because the tsconfig does not include the source directory, add this as the first path
    // element.
    tsconfig.files = tsconfig.files.map(name => path.join(this.inputPaths[0], name));
    return tsconfig;
  }

  _createServiceHost() {
    var tsconfig = this._loadTsConfig();

    this._tsConfigFiles = tsconfig.files.splice(0);

    this._tsOpts = ts.convertCompilerOptionsFromJson(tsconfig['compilerOptions'],
      this.inputPaths[0], this._tsConfigPath).options;
    this._tsOpts.rootDir = '';
    this._tsOpts.outDir = '';

    this._tsServiceHost = new CustomLanguageServiceHost(
      this._tsOpts, this._rootFilePaths, this._fileRegistry, this.inputPaths[0],
      tsconfig['compilerOptions'].paths, this._tsConfigPath);
    this._tsService = ts.createLanguageService(this._tsServiceHost, ts.createDocumentRegistry());
  }

  _collectErrors(allDiagnostics) {
    const errors = allDiagnostics.map(diagnostic => {
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
      if (diagnostic.file) {
        const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
        const line = position.line;
        const character = position.character;
        return `  ${diagnostic.file.fileName} (${line + 1}, ${character + 1}): ${message}`;
      } else {
        return `  Error: ${message}`;
      }
    });

    if (errors.length) {
      return errors.join('\n');
    }
  }

  _outputFile(absoluteFilePath, fileContent, registry) {
    absoluteFilePath = path.resolve(this.cachePath, absoluteFilePath);
    let inputFilePath = absoluteFilePath;
    // Replace the input path by the output.
    absoluteFilePath = absoluteFilePath.replace(this.inputPaths[0], this.cachePath);
    const outputFilePath = absoluteFilePath.replace(this.cachePath, this.outputPath);

    if (registry) {
      registry.outputs.add(absoluteFilePath);
    }

    fse.mkdirsSync(path.dirname(absoluteFilePath));
    const content = this.fixSourceMapSources(fileContent, inputFilePath);
    fs.writeFileSync(absoluteFilePath, content, FS_OPTS);

    fse.mkdirsSync(path.dirname(outputFilePath));
    try {
      fs.symlinkSync(absoluteFilePath, outputFilePath);
    } catch (e) {
      const contentStr = fs.readFileSync(absoluteFilePath);
      fs.writeFileSync(outputFilePath, contentStr);
    }
  }

  _addNewFileEntry(entry, checkDuplicates /* = true */) {
    if (checkDuplicates === undefined) {
      checkDuplicates = true;
    }

    const p = path.join(this.inputPaths[0], entry.relativePath);
    if (checkDuplicates && this._fileRegistry[p]) {
      throw `Trying to add a new entry to an already existing one: "${p}`;
    }

    this._fileRegistry[p] = {
      version: entry.mtime,
      outputs: new Set()
    };
  }

  /**
   * There is a bug in TypeScript 1.6, where the sourceRoot and inlineSourceMap properties
   * are exclusive. This means that the sources property always contains relative paths
   * (e.g, ../../../../@angular/di/injector.ts).
   *
   * Here, we normalize the sources property and remove the ../../../
   *
   * This issue is fixed in https://github.com/Microsoft/TypeScript/pull/5620.
   * Once we switch to TypeScript 1.8, we can remove this method.
   */
  fixSourceMapSources(content, inputFilePath) {
    try {
      const marker = '//# sourceMappingURL=data:application/json;base64,';

      let index = content.indexOf(marker);
      if (index == -1) {
        const pathMarker = '//# sourceMappingURL=';
        index = content.indexOf(pathMarker);
        if (index == -1) {
          return content;
        }

        // We have a regular path, make it relative to the input path.
        let base = content.substring(0, index + pathMarker.length);
        let mapPath = content.substring(index + pathMarker.length);
        if (mapPath.startsWith(this.outputPath)) {
          mapPath = mapPath.replace(this.outputPath, this.inputPaths[0]);
        } else if (!mapPath.startsWith(this.inputPaths[0])) {
          mapPath = path.join(this.inputPaths[0], path.dirname(this._tsConfigPath), mapPath);
        }

        mapPath = path.relative(path.dirname(inputFilePath), mapPath);
        return '' + base + mapPath;
      }

      var base = content.substring(0, index + marker.length);
      var sourceMapBit = new Buffer(content.substring(index + marker.length), 'base64').toString('utf8');
      var sourceMaps = JSON.parse(sourceMapBit);
      var source = sourceMaps.sources[0];
      sourceMaps.sources = [source.substring(source.lastIndexOf('../') + 3)];
      return '' + base + new Buffer(JSON.stringify(sourceMaps)).toString('base64');
    } catch (e) {
      return content;
    }
  }
}

class CustomLanguageServiceHost {
  constructor(compilerOptions, fileNames, fileRegistry, treeInputPath, paths, tsConfigPath) {
    this.compilerOptions = compilerOptions;
    this.fileNames = fileNames;
    this.fileRegistry = fileRegistry;
    this.treeInputPath = treeInputPath;
    this.currentDirectory = treeInputPath;
    this.defaultLibFilePath = ts.getDefaultLibFilePath(compilerOptions).replace(/\\/g, '/');
    this.paths = paths;
    this.tsConfigPath = tsConfigPath;
    this.projectVersion = 0;
  }

  getScriptFileNames() {
    return this.fileNames;
  }

  getScriptVersion(fileName) {
    fileName = path.resolve(this.treeInputPath, fileName);
    return this.fileRegistry[fileName] && this.fileRegistry[fileName].version.toString();
  }

  getProjectVersion() {
    return this.projectVersion.toString();
  }

  /**
   * Resolve a moduleName based on the path mapping defined in the tsconfig.
   * @param moduleName The module name to resolve.
   * @returns {string|boolean} A string that is the path of the module, if found, or a boolean
   *                           indicating if resolution should continue with default.
   * @private
   */
  _resolveModulePathWithMapping(moduleName) {
    // check if module name should be used as-is or it should be mapped to different value
    let longestMatchedPrefixLength = 0;
    let matchedPattern;
    let matchedWildcard;
    const paths = this.paths || {};

    for (let pattern of Object.keys(paths)) {
      if (pattern.indexOf('*') != pattern.lastIndexOf('*')) {
        throw `Invalid path mapping pattern: "${pattern}"`;
      }

      let indexOfWildcard = pattern.indexOf('*');
      if (indexOfWildcard !== -1) {
        // check if module name starts with prefix, ends with suffix and these two don't overlap
        let prefix = pattern.substr(0, indexOfWildcard);
        let suffix = pattern.substr(indexOfWildcard + 1);
        if (moduleName.length >= prefix.length + suffix.length &&
          moduleName.startsWith(prefix) &&
          moduleName.endsWith(suffix)) {

          // use length of matched prefix as betterness criteria
          if (longestMatchedPrefixLength < prefix.length) {
            longestMatchedPrefixLength = prefix.length;
            matchedPattern = pattern;
            matchedWildcard = moduleName.substr(prefix.length, moduleName.length - suffix.length);
          }
        }
      } else {
        // Pattern does not contain asterisk - module name should exactly match pattern to succeed.
        if (pattern === moduleName) {
          matchedPattern = pattern;
          matchedWildcard = undefined;
          break;
        }
      }
    }

    if (!matchedPattern) {
      // We fallback to the old module resolution.
      return true;
    }

    // some pattern was matched - module name needs to be substituted
    let substitutions = this.paths[matchedPattern];
    for (let subst of substitutions) {
      if (subst.indexOf('*') != subst.lastIndexOf('*')) {
        throw `Invalid substitution: "${subst}" for pattern "${matchedPattern}".`;
      }
      if (subst == '*') {
        // Trigger default module resolution.
        return true;
      }
      // replace * in substitution with matched wildcard
      let p = matchedWildcard ? subst.replace('*', matchedWildcard) : subst;
      // if substituion is a relative path - combine it with baseUrl
      p = path.isAbsolute(p) ? p : path.join(this.treeInputPath, path.dirname(this.tsConfigPath), p);
      if (fs.existsSync(p)) {
        return p;
      }
    }

    // This is an error; there was a match but no corresponding mapping was valid.
    // Do not call the default module resolution.
    return false;
  }

  /**
   * This method is called quite a bit to lookup 3 kinds of paths:
   * 1/ files in the fileRegistry
   *   - these are the files in our project that we are watching for changes
   *   - in the future we could add caching for these files and invalidate the cache when
   *     the file is changed lazily during lookup
   * 2/ .d.ts and library files not in the fileRegistry
   *   - these are not our files, they come from tsd or typescript itself
   *   - these files change only rarely but since we need them very rarely, it's not worth the
   *     cache invalidation hassle to cache them
   * 3/ bogus paths that typescript compiler tries to lookup during import resolution
   *   - these paths are tricky to cache since files come and go and paths that was bogus in the
   *     past might not be bogus later
   *
   * In the initial experiments the impact of this caching was insignificant (single digit %) and
   * not worth the potential issues with stale cache records.
   */
  getScriptSnapshot(tsFilePath) {
    var absoluteTsFilePath;
    if (tsFilePath == this.defaultLibFilePath || path.isAbsolute(tsFilePath)) {
      absoluteTsFilePath = tsFilePath;
    } else if (this.compilerOptions.moduleResolution === 2 /* NodeJs */ &&
      tsFilePath.match(/^node_modules/)) {
      absoluteTsFilePath = path.resolve(tsFilePath);
    } else if (tsFilePath.match(/^rxjs/)) {
      absoluteTsFilePath = path.resolve('node_modules', tsFilePath);
    } else {
      absoluteTsFilePath = path.join(this.treeInputPath, tsFilePath);
    }
    if (!fs.existsSync(absoluteTsFilePath)) {
      // TypeScript seems to request lots of bogus paths during import path lookup and resolution,
      // so we we just return undefined when the path is not correct.
      return undefined;
    }

    return ts.ScriptSnapshot.fromString(fs.readFileSync(absoluteTsFilePath, FS_OPTS));
  }

  resolveModuleNames(moduleNames, containingFile)/*: ResolvedModule[]*/ {
    return moduleNames.map((moduleName) => {
      let shouldResolveUsingDefaultMethod = false;
      for (const ext of ['', '.ts', '.d.ts']) {
        const name = `${moduleName}${ext}`;
        const maybeModule = this._resolveModulePathWithMapping(name, containingFile);
        if (typeof maybeModule == 'string') {
          return {
            resolvedFileName: maybeModule,
            isExternalLibraryImport: false
          };
        } else {
          shouldResolveUsingDefaultMethod = shouldResolveUsingDefaultMethod || maybeModule;
        }
      }

      return shouldResolveUsingDefaultMethod &&
        ts.resolveModuleName(moduleName, containingFile, this.compilerOptions, {
          fileExists(fileName) {
            return fs.existsSync(fileName);
          },
          readFile(fileName) {
            return fs.readFileSync(fileName, 'utf-8');
          },
          directoryExists(directoryName) {
            try {
              const stats = fs.statSync(directoryName);
              return stats && stats.isDirectory();
            } catch (e) {
              return false;
            }
          }
        }).resolvedModule;
    });
  }

  getCurrentDirectory() {
    return this.currentDirectory;
  }

  getCompilationSettings() {
    return this.compilerOptions;
  }

  getDefaultLibFileName(/* options */) {
    // ignore options argument, options should not change during the lifetime of the plugin
    return this.defaultLibFilePath;
  }
}


module.exports = BroccoliTypeScriptCompiler;
