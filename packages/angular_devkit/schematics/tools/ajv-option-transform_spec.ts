/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-any
import 'rxjs/add/operator/mergeMap';
import { AjvSchemaRegistry } from './ajv-option-transform';


describe('AjvSchemaRegistry', () => {
  it('works asynchronously', done => {
    const registry  = new AjvSchemaRegistry();
    const data: any = {};  // tslint:disable:no-any

    registry
      .compile({
        properties: {
          bool: { type: 'boolean' },
          str: { type: 'string', default: 'someString' },
          obj: {
            properties: {
              num: { type: 'number' },
              other: { type: 'number', default: 0 },
            },
          },
          tslint: {
            $ref: 'http://json.schemastore.org/tslint#',
          },
        },
      })
      .mergeMap(validator => validator(data))
      .map(result => {
        expect(result.success).toBe(true);
        expect(data.obj.num).toBeUndefined();
        expect(data.tslint).not.toBeUndefined();
      })
      .subscribe(done, done.fail);
    });

  // Synchronous failure is only used internally.
  // If it's meant to be used externally then this test should change to truly be synchronous
  // (i.e. not relyign on the observable).
  it('works synchronously', done => {
    const registry  = new AjvSchemaRegistry();
    const data: any = {};  // tslint:disable:no-any
    let isDone = false;

    registry
      .compile({
        properties: {
          bool: { type: 'boolean' },
          str: { type: 'string', default: 'someString' },
          obj: {
            properties: {
              num: { type: 'number' },
              other: { type: 'number', default: 0 },
            },
          },
        },
      })
      .mergeMap(validator => validator(data))
      .map(result => {
        expect(result.success).toBe(true);
        expect(data.obj.num).toBeUndefined();
      })
      .subscribe(() => {
        isDone = true;
      }, done.fail);

    expect(isDone).toBe(true);
    done();
  });
});
