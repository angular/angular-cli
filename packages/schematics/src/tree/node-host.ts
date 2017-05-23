import {FileSystemTreeHost} from './filesystem';
import * as fs from 'fs';
import {join} from 'path';


export class NodeJsHost implements FileSystemTreeHost {
  constructor(private _root: string) {}

  listDirectory(path: string) {
    return fs.readdirSync(this.join(this._root, path));
  }
  isDirectory(path: string) {
    return fs.statSync(this.join(this._root, path)).isDirectory();
  }
  readFile(path: string) {
    return fs.readFileSync(this.join(this._root, path));
  }

  join(path1: string, path2: string) {
    return join(path1, path2);
  }
}
