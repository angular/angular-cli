import * as ts from 'typescript';

export class ProgramManager {
  private _program: ts.Program;

  get program() { return this._program; }

  /**
   * Create and manage a ts.program instance.
   */
  constructor(
    private _files: string[],
    private _compilerOptions: ts.CompilerOptions,
    private _compilerHost: ts.CompilerHost
  ) {
    this._program = ts.createProgram(_files, _compilerOptions, _compilerHost);
  }

  /**
   * Create a new Program, based on the old one. This will trigger a resolution of all
   * transitive modules, which include files that might just have been generated.
   * This needs to happen after the code generator has been created for generated files
   * to be properly resolved.
   */
  update(newFiles: string[] = []) {
    // Remove files that don't exist anymore, and add new files.
    this._files = this._files.concat(newFiles)
      .filter(x => this._compilerHost.fileExists(x));

    this._program = ts.createProgram(this._files, this._compilerOptions, this._compilerHost,
      this._program);
  }

  hasFile(fileName: string) {
    return this._files.includes(fileName);
  }
}
