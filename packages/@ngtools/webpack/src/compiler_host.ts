import * as ts from 'typescript';
import {basename, dirname, join, sep} from 'path';
import * as fs from 'fs';
import {WebpackResourceLoader} from './resource_loader';
import {TypeScriptFileRefactor} from './refactor';
const MagicString = require('magic-string');


export interface OnErrorFn {
  (message: string): void;
}


const dev = Math.floor(Math.random() * 10000);

// partial copy of TypeScriptFileRefactor
class InlineResourceRefactor {
  private _sourceString: string;
  private _changed = false;

  constructor(content: string, private _sourceFile: ts.SourceFile) {
    this._sourceString = new MagicString(content);
  }

  getResourcesNodes() {
    return this.findAstNodes(this._sourceFile, ts.SyntaxKind.ObjectLiteralExpression, true)
      .map(node => this.findAstNodes(node, ts.SyntaxKind.PropertyAssignment))
      .filter(node => !!node)
      .reduce((prev, curr: ts.PropertyAssignment[]) => prev.concat(curr
        .filter(node =>
          node.name.kind == ts.SyntaxKind.Identifier ||
          node.name.kind == ts.SyntaxKind.StringLiteral
        )
      ), [] ) as ts.PropertyAssignment[];
  }

  getResourceContentAndType(_content: string, defaultType: string) {
    let type = defaultType;
    const content = _content
      .replace(/!(\w*)!/, (_, _type) => {
        type = _type;
        return '';
      });
    return {content, type};
  }

  get hasChanged() {
    return this._changed;
  }

  getNewContent() {
    return this._sourceString.toString();
  }

  findAstNodes = TypeScriptFileRefactor.prototype.findAstNodes;
  replaceNode = TypeScriptFileRefactor.prototype.replaceNode;

}

export class VirtualStats implements fs.Stats {
  protected _ctime = new Date();
  protected _mtime = new Date();
  protected _atime = new Date();
  protected _btime = new Date();
  protected _dev = dev;
  protected _ino = Math.floor(Math.random() * 100000);
  protected _mode = parseInt('777', 8);  // RWX for everyone.
  protected _uid = process.env['UID'] || 0;
  protected _gid = process.env['GID'] || 0;

  constructor(protected _path: string) {}

  isFile() { return false; }
  isDirectory() { return false; }
  isBlockDevice() { return false; }
  isCharacterDevice() { return false; }
  isSymbolicLink() { return false; }
  isFIFO() { return false; }
  isSocket() { return false; }

  get dev() { return this._dev; }
  get ino() { return this._ino; }
  get mode() { return this._mode; }
  get nlink() { return 1; }  // Default to 1 hard link.
  get uid() { return this._uid; }
  get gid() { return this._gid; }
  get rdev() { return 0; }
  get size() { return 0; }
  get blksize() { return 512; }
  get blocks() { return Math.ceil(this.size / this.blksize); }
  get atime() { return this._atime; }
  get mtime() { return this._mtime; }
  get ctime() { return this._ctime; }
  get birthtime() { return this._btime; }
}

export class VirtualDirStats extends VirtualStats {
  constructor(_fileName: string) {
    super(_fileName);
  }

  isDirectory() { return true; }

  get size() { return 1024; }
}

export class VirtualFileStats extends VirtualStats {
  private _sourceFile: ts.SourceFile | null;
  private _resources: string[] = [];

  constructor(_fileName: string, private _content: string) {
    super(_fileName);
  }

  get content() { return this._content; }
  set content(v: string) {
    this._content = v;
    this._mtime = new Date();
    this._sourceFile = null;
  }
  set sourceFile(sourceFile: ts.SourceFile) {
    this._sourceFile = sourceFile;
  }
  get sourceFile() {
    return this._sourceFile;
  }

  addResource(resourcePath: string) {
    this._resources.push(resourcePath);
  }

  get resources(){ return this._resources; }

  isFile() { return true; }

  get size() { return this._content.length; }
}


export class WebpackCompilerHost implements ts.CompilerHost {
  private _delegate: ts.CompilerHost;
  private _files: {[path: string]: VirtualFileStats | null} = Object.create(null);
  private _directories: {[path: string]: VirtualDirStats | null} = Object.create(null);
  private _cachedResources: {[path: string]: string | undefined} = Object.create(null);

  private _changedFiles: {[path: string]: boolean} = Object.create(null);
  private _changedDirs: {[path: string]: boolean} = Object.create(null);

  private _basePath: string;
  private _setParentNodes: boolean;

  private _cache = false;
  private _resourceLoader?: WebpackResourceLoader | undefined;

  constructor(private _options: ts.CompilerOptions, basePath: string,
    private _defaultTemplateType = 'html', private _defaultStyleType = 'css') {
    this._setParentNodes = true;
    this._delegate = ts.createCompilerHost(this._options, this._setParentNodes);
    this._basePath = this._normalizePath(basePath);
  }

  private _normalizePath(path: string) {
    return path.replace(/\\/g, '/');
  }

  resolve(path: string) {
    path = this._normalizePath(path);
    if (path[0] == '.') {
      return this._normalizePath(join(this.getCurrentDirectory(), path));
    } else if (path[0] == '/' || path.match(/^\w:\//)) {
      return path;
    } else {
      return this._normalizePath(join(this._basePath, path));
    }
  }

  private _setFileContent(fileName: string, content: string, resource?: boolean) {
    this._files[fileName] = new VirtualFileStats(fileName, content);

    let p = dirname(fileName);
    while (p && !this._directories[p]) {
      this._directories[p] = new VirtualDirStats(p);
      this._changedDirs[p] = true;
      p = dirname(p);
    }

    // only ts files are expected on getChangedFiles()
    if (!resource) {
      this._changedFiles[fileName] = true;
    }
  }

  get dirty() {
    return Object.keys(this._changedFiles).length > 0;
  }

  enableCaching() {
    this._cache = true;
  }

  resetChangedFileTracker() {
    this._changedFiles = Object.create(null);
    this._changedDirs = Object.create(null);
  }

  getChangedFilePaths(): string[] {
    return Object.keys(this._changedFiles);
  }

  getNgFactoryPaths(): string[] {
    return Object.keys(this._files)
      .filter(fileName => fileName.endsWith('.ngfactory.js') || fileName.endsWith('.ngstyle.js'));
  }

  invalidate(fileName: string): void {
    fileName = this.resolve(fileName);
    const file = this._files[fileName];
    if (file != null) {
      file.resources
        .forEach(r => this.invalidate(r));

      this._files[fileName] = null;
    }
    if (fileName in this._changedFiles) {
        this._changedFiles[fileName] = true;
    }
  }

  /**
   * Return the corresponding component path
   * or undefined if path isn't considered a resource
   */
  private _getComponentPath(path: string) {
    const match = path.match(
      // match ngtemplate, ngstyles but not shim nor summaries
      /(.*)\.(?:ngtemplate|(?:ngstyles[\d]*))(?!.*(?:shim.ngstyle.ts|ngsummary.json)$).*$/
    );

    if (match != null) {
      return match[1] + '.ts';
    }
  }

  fileExists(fileName: string, delegate = true): boolean {
    fileName = this.resolve(fileName);
    if (this._files[fileName] != null) {
      return true;
    }

    const componentPath = this._getComponentPath(fileName);
    if (componentPath != null) {
      return this._files[componentPath] == null &&
        this._readResource(fileName, componentPath) != null;
    } else {
      if (delegate) {
        return this._delegate.fileExists(fileName);
      }
    }

    return false;
  }

  readFile(fileName: string): string {
    fileName = this.resolve(fileName);

    const stats = this._files[fileName];
    if (stats == null) {
      const componentPath = this._getComponentPath(fileName);
      if (componentPath != null) {
        return this._readResource(fileName, componentPath);
      }

      const result = this._delegate.readFile(fileName);
      if (result !== undefined && this._cache) {
        this._setFileContent(fileName, result);
      }

      return result;
    }
    return stats.content;
  }

  private _readResource(resourcePath: string, componentPath: string) {
    // Trigger source file build which will create and cache associated resources
    this.getSourceFile(componentPath);

    const stats = this._files[resourcePath];
    if (stats != null) {
      return stats.content;
    }
  }

  // Does not delegate, use with `fileExists/directoryExists()`.
  stat(path: string): VirtualStats {
    path = this.resolve(path);
    return this._files[path] || this._directories[path];
  }

  directoryExists(directoryName: string, delegate = true): boolean {
    directoryName = this.resolve(directoryName);
    return (this._directories[directoryName] != null)
            || (delegate
                && this._delegate.directoryExists != undefined
                && this._delegate.directoryExists(directoryName));
  }

  getFiles(path: string): string[] {
    path = this.resolve(path);
    return Object.keys(this._files)
      .filter(fileName => dirname(fileName) == path)
      .map(path => basename(path));
  }

  getDirectories(path: string): string[] {
    path = this.resolve(path);
    const subdirs = Object.keys(this._directories)
      .filter(fileName => dirname(fileName) == path)
      .map(path => basename(path));

    let delegated: string[];
    try {
      delegated = this._delegate.getDirectories(path);
    } catch (e) {
      delegated = [];
    }
    return delegated.concat(subdirs);
  }

  private _buildSourceFile(fileName: string, content: string, languageVersion: ts.ScriptTarget) {
    let sourceFile = ts.createSourceFile(fileName, content, languageVersion, this._setParentNodes);

    const refactor = new InlineResourceRefactor(content, sourceFile);

    const prefix = fileName.substring(0, fileName.lastIndexOf('.'));
    const resources: string[] = [];

    refactor.getResourcesNodes()
      .forEach( (node: any) => {
        const name = node.name.text;

        if (name === 'template') {
          const {content, type} = refactor.getResourceContentAndType(
            node.initializer.text,
            this._defaultTemplateType
          );
          const path = `${prefix}.ngtemplate.${type}`;

          // always cache resources
          this._setFileContent(path, content, true);
          resources.push(path);

          refactor.replaceNode(node, `templateUrl: './${basename(path)}'`);
        } else {
          if (name === 'styles') {
            const arr = <ts.ArrayLiteralExpression[]>
              refactor.findAstNodes(node, ts.SyntaxKind.ArrayLiteralExpression, false);

            if (arr && arr.length > 0 && arr[0].elements.length > 0) {
              const styles = arr[0].elements
                .map( (element: any) => element.text)
                .map( (_content, idx) => {
                  const {content, type} = refactor.getResourceContentAndType(
                    _content,
                    this._defaultStyleType
                  );

                  return {path: `${prefix}.ngstyles${idx}.${type}`, content};
                });

              styles.forEach(({path, content}) => {
                  // always cache resources
                  this._setFileContent(path, content, true);
                  resources.push(path);
              });

              const styleUrls = styles
                .map( ({path}) => `'./${basename(path)}'`)
                .join(',');

              refactor.replaceNode(node, `styleUrls: [${styleUrls}]`);
            }
          }
        }
      });

    if (refactor.hasChanged) {
      sourceFile = ts.createSourceFile(
        fileName, refactor.getNewContent(), languageVersion, this._setParentNodes
      );
    }

    return {
      sourceFile,
      resources
    };
  }

  getSourceFile(fileName: string, languageVersion = ts.ScriptTarget.Latest, _onError?: OnErrorFn) {
    fileName = this.resolve(fileName);

    const stats = this._files[fileName];
    if (stats != null && stats.sourceFile != null) {
      return stats.sourceFile;
    }

    const content = this.readFile(fileName);
    if (!content) {
      return;
    }

    const {sourceFile, resources} = this._buildSourceFile(fileName, content, languageVersion);

    if (this._cache) {
      const stats = this._files[fileName];
      stats.sourceFile = sourceFile;

      resources.forEach(r => stats.addResource(r));
    }

    return sourceFile;
  }

  getCancellationToken() {
    return this._delegate.getCancellationToken!();
  }

  getDefaultLibFileName(options: ts.CompilerOptions) {
    return this._delegate.getDefaultLibFileName(options);
  }

  // This is due to typescript CompilerHost interface being weird on writeFile. This shuts down
  // typings in WebStorm.
  get writeFile() {
    return (fileName: string, data: string, _writeByteOrderMark: boolean,
            _onError?: (message: string) => void, _sourceFiles?: ts.SourceFile[]): void => {

      fileName = this.resolve(fileName);
      this._setFileContent(fileName, data);
    };
  }

  getCurrentDirectory(): string {
    return this._basePath !== null ? this._basePath : this._delegate.getCurrentDirectory();
  }

  getCanonicalFileName(fileName: string): string {
    fileName = this.resolve(fileName);
    return this._delegate.getCanonicalFileName(fileName);
  }

  useCaseSensitiveFileNames(): boolean {
    return this._delegate.useCaseSensitiveFileNames();
  }

  getNewLine(): string {
    return this._delegate.getNewLine();
  }

  setResourceLoader(resourceLoader: WebpackResourceLoader) {
    this._resourceLoader = resourceLoader;
  }

  // this function and resourceLoader is pretty new and seem unusued so I ignored it for the moment.
  readResource(fileName: string) {
    if (this._resourceLoader) {
      const denormalizedFileName = fileName.replace(/\//g, sep);
      const resourceDeps = this._resourceLoader.getResourceDependencies(denormalizedFileName);

      if (this._cachedResources[fileName] === undefined
        || resourceDeps.some((dep) => this._changedFiles[this.resolve(dep)])) {
        return this._resourceLoader.get(denormalizedFileName)
          .then((resource) => {
            // Add resource dependencies to the compiler host file list.
            // This way we can check the changed files list to determine whether to use cache.
            this._resourceLoader.getResourceDependencies(denormalizedFileName)
              .forEach((dep) => this.readFile(dep));
            this._cachedResources[fileName] = resource;
            return resource;
          });
      } else {
        return this._cachedResources[fileName];
      }
    } else {
      return this.readFile(fileName);
    }
  }
}
