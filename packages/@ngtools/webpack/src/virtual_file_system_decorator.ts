import { Stats } from 'fs';
import { InputFileSystem, Callback } from './webpack';
import { WebpackCompilerHost } from './compiler_host';


export class VirtualFileSystemDecorator implements InputFileSystem {
  constructor(
    private _inputFileSystem: InputFileSystem,
    private _webpackCompilerHost: WebpackCompilerHost
  ) { }

  private _readFileSync(path: string): string | null {
    if (this._webpackCompilerHost.fileExists(path, false)) {
      return this._webpackCompilerHost.readFile(path);
    }

    return null;
  }

  private _statSync(path: string): Stats | null {
    if (this._webpackCompilerHost.fileExists(path, false)
      || this._webpackCompilerHost.directoryExists(path, false)) {
      return this._webpackCompilerHost.stat(path);
    }

    return null;
  }

  private _readDirSync(path: string): string[] | null {
    if (this._webpackCompilerHost.directoryExists(path, false)) {
      const dirs = this._webpackCompilerHost.getDirectories(path);
      const files = this._webpackCompilerHost.getFiles(path);
      return files.concat(dirs);
    }

    return null;
  }

  stat(path: string, callback: Callback<any>): void {
    const result = this._statSync(path);
    if (result) {
      callback(null, result);
    } else {
      this._inputFileSystem.stat(path, callback);
    }
  }

  readdir(path: string, callback: Callback<any>): void {
    const result = this._readDirSync(path);
    if (result) {
      callback(null, result);
    } else {
      this._inputFileSystem.readdir(path, callback);
    }
  }

  readFile(path: string, callback: Callback<any>): void {
    const result = this._readFileSync(path);
    if (result) {
      callback(null, result);
    } else {
      this._inputFileSystem.readFile(path, callback);
    }
  }

  readJson(path: string, callback: Callback<any>): void {
    this._inputFileSystem.readJson(path, callback);
  }

  readlink(path: string, callback: Callback<any>): void {
    this._inputFileSystem.readlink(path, callback);
  }

  statSync(path: string): Stats {
    const result = this._statSync(path);
    return result || this._inputFileSystem.statSync(path);
  }

  readdirSync(path: string): string[] {
    const result = this._readDirSync(path);
    return result || this._inputFileSystem.readdirSync(path);
  }

  readFileSync(path: string): string {
    const result = this._readFileSync(path);
    return result || this._inputFileSystem.readFileSync(path);
  }

  readJsonSync(path: string): string {
    return this._inputFileSystem.readJsonSync(path);
  }

  readlinkSync(path: string): string {
    return this._inputFileSystem.readlinkSync(path);
  }

  purge(changes?: string[] | string): void {
    if (typeof changes === 'string') {
      this._webpackCompilerHost.invalidate(changes);
    } else if (Array.isArray(changes)) {
      changes.forEach((fileName: string) => this._webpackCompilerHost.invalidate(fileName));
    }
    if (this._inputFileSystem.purge) {
      this._inputFileSystem.purge(changes);
    }
  }
}
