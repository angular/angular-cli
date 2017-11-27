import * as ts from 'typescript';
import { sep } from 'path';
import { WebpackResourceLoader } from '../resource_loader';

function denormalizePath(path: string): string {
  return path.replace(/\//g, sep);
}

export interface OnErrorFn {
  (message: string): void;
}

export class NgcCompilerHost implements ts.CompilerHost {
  private resourceCache = new Map<string, string>();
  private host: ts.CompilerHost;

  constructor(private options: ts.CompilerOptions, public resourceLoader?: WebpackResourceLoader) {
    this.host = ts.createCompilerHost(this.options, true);
  }

  fileExists(fileName: string): boolean {
    return this.host.fileExists(fileName);
  }

  readFile(fileName: string): string {
    return this.host.readFile(fileName);
  }

  getDirectories(path: string): string[] {
    return this.host.getDirectories(path);
  }

  getSourceFile(fileName: string, languageVersion: ts.ScriptTarget, _onError?: OnErrorFn) {
    return this.host.getSourceFile(fileName, languageVersion, _onError);
  }

  getCancellationToken() {
    return this.host.getCancellationToken!();
  }

  getDefaultLibFileName(options: ts.CompilerOptions) {
    return this.host.getDefaultLibFileName(options);
  }

  writeFile(fileName: string, data: string, _writeByteOrderMark: boolean,
            _onError?: (message: string) => void, _sourceFiles?: ts.SourceFile[]) {
    return this.host.writeFile(fileName, data, _writeByteOrderMark, _onError, _sourceFiles);
  }

  getCurrentDirectory(): string {
    return this.host.getCurrentDirectory();
  }

  getCanonicalFileName(fileName: string): string {
    return this.host.getCanonicalFileName(fileName);
  }

  useCaseSensitiveFileNames(): boolean {
    return this.host.useCaseSensitiveFileNames();
  }

  getNewLine(): string {
    return this.host.getNewLine();
  }

  readResource(fileName: string): Promise<string> | string {
    if (this.resourceLoader) {
      // These paths are meant to be used by the loader so we must denormalize them.
      const denormalizedFileName = denormalizePath(fileName);
      return this.resourceLoader.get(denormalizedFileName)
        .then( content => {
          this.resourceCache.set(denormalizedFileName, content);
          return content;
        });
    } else {
      return this.readFile(fileName);
    }
  }

  /**
   * Returns a cached resource, if the resource is not cached returns undefined.
   * Will not try to get the resource if it does not exists.
   * @param {string} fileName
   * @returns {string}
   */
  getResource(fileName: string): string | undefined {
    return this.resourceCache.get(fileName);
  }
}
