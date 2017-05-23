import {VirtualFileSystemSink, VirtualFileSystemSinkHost} from './virtual-filesystem';

import * as fs from 'fs';
import {dirname, join} from 'path';
import {Observable} from 'rxjs/Observable';


export class FileSystemSinkHost implements VirtualFileSystemSinkHost {
  constructor(protected _root: string) {}

  exists(path: string): Observable<boolean> {
    return new Observable(observer => {
      fs.exists(join(this._root, path), exists => {
        observer.next(exists);
        observer.complete();
      });
    });
  }

  delete(path: string): Observable<void> {
    return new Observable<void>(o => {
      fs.unlink(join(this._root, path), (err) => {
        if (err) {
          o.error(err);
        } else {
          o.complete();
        }
      });
    });
  }

  mkDir(path: string): void {
    const paths = [];
    for (; path != dirname(path); path = dirname(path)) {
      if (fs.existsSync(path)) {
        break;
      }
      paths.unshift(path);
    }
    paths.forEach(path => {
      fs.mkdirSync(path);
    });
  }

  write(path: string, content: Buffer): Observable<void> {
    path = join(this._root, path);
    return new Observable<void>(o => {
      this.mkDir(dirname(path));

      fs.writeFile(path, content, (err) => {
        if (err) {
          o.error(err);
        } else {
          o.complete();
        }
      });
    });
  }

  read(path: string): Observable<Buffer> {
    path = join(this._root, path);
    return new Observable(o => {
      fs.readFile(path, (err, data) => {
        if (err) {
          o.error(err);
        } else {
          o.next(data);
          o.complete();
        }
      });
    });
  }

  rename(from: string, to: string): Observable<void> {
    from = join(this._root, from);
    to = join(this._root, to);

    return new Observable<void>(o => {
      fs.rename(from, to, err => {
        if (err) {
          o.error(err);
        } else {
          o.complete();
        }
      });
    });
  }
}


export class FileSystemSink extends VirtualFileSystemSink {
  constructor(protected _root: string, force?: boolean) {
    super(new FileSystemSinkHost(_root), force);
  }
}
