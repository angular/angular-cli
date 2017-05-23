import {FileEntry} from './interface';
import {SchematicPath} from '../utility/path';


export class SimpleFileEntry implements FileEntry {
  constructor(private _path: SchematicPath, private _content: Buffer) {}

  get path() { return this._path; }
  get content() { return this._content; }
}


export class LazyFileEntry implements FileEntry {
  private _content: Buffer | null = null;

  constructor(private _path: SchematicPath, private _load: (path?: SchematicPath) => Buffer) {}

  get path() { return this._path; }
  get content() { return this._content || (this._content = this._load(this._path)); }
}
