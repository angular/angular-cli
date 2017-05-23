import {UpdateBuffer} from '../utility/update-buffer';
import {FileEntry, UpdateRecorder} from './interface';
import {ContentHasMutatedException} from '../exception/exception';


export class UpdateRecorderBase implements UpdateRecorder {
  protected _path: string;
  protected _original: Buffer;
  protected _content: UpdateBuffer;

  constructor(entry: FileEntry) {
    this._original = new Buffer(entry.content);
    this._content = new UpdateBuffer(entry.content);
    this._path = entry.path;
  }

  get path() { return this._path; }

  // These just record changes.
  insertLeft(index: number, content: Buffer | string): UpdateRecorder {
    this._content.insertLeft(index, typeof content == 'string' ? new Buffer(content) : content);
    return this;
  }
  insertRight(index: number, content: Buffer | string): UpdateRecorder {
    this._content.insertRight(index, typeof content == 'string' ? new Buffer(content) : content);
    return this;
  }
  remove(index: number, length: number): UpdateRecorder {
    this._content.remove(index, length);
    return this;
  }

  apply(content: Buffer): Buffer {
    if (!content.equals(this._content.original)) {
      throw new ContentHasMutatedException(this.path);
    }
    return this._content.generate();
  }
}
