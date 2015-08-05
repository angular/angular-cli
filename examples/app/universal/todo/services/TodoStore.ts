/// <reference path="../../../../../custom_typings/_custom.d.ts" />
import {Injectable} from 'angular2/di';
import {ListWrapper} from 'angular2/src/facade/collection';
// base model for RecordStore
export class KeyModel {
  constructor(public key: number) {}
}

export class Todo extends KeyModel {
  constructor(key: number, public title: string, public completed: boolean) { super(key); }
}

@Injectable()
export class TodoFactory {
  _uid: number = 0;

  nextUid(): number { return ++this._uid; }

  create(title: string, isCompleted: boolean): Todo {
    return new Todo(this.nextUid(), title, isCompleted);
  }
}

// store manages any generic item that inherits from KeyModel
@Injectable()
export class Store {
  list: Array<KeyModel> = [];

  constructor() {

  }

  add(record: KeyModel): void { this.list.push(record); }

  remove(record: KeyModel): void { this._spliceOut(record); }

  removeBy(callback: any): void {
    var records = this.list.filter(callback);

    for (let i = 0; i < records.length; ++i) {
      let index = this.list.indexOf(records[i]);
      this.list.splice(index, 1);
    }
  }

  private _spliceOut(record: KeyModel) {
    var i = this._indexFor(record);
    if (i > -1) {
      return this.list.splice(i, 1)[0];
    }
    return null;
  }

  private _indexFor(record: KeyModel) { return this.list.indexOf(record); }
}
