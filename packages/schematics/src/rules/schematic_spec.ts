// import {
//   Tree,
//   TreeTransformFactory,
//   SchematicDescription
// } from '@angular/schematics';
// import {Schematic} from './schematic';
//
// import 'rxjs/add/operator/toArray';
// import 'rxjs/add/operator/toPromise';
// import {Observable} from 'rxjs/Observable';
//
//
// describe('Schematic', () => {
//
//   it('works without a transform', done => {
//     const desc: SchematicDescription<any> = {
//       name: 'test',
//       description: '',
//       inputs: [
//         'null://',
//         [ 'null://' ]
//       ]
//     };
//
//     const schematic = new Schematic(desc, 'some/path');
//
//     schematic.run({})
//       .toArray()
//       .toPromise()
//       .then(x => {
//         expect(x.length).toBe(2);
//         expect(x[0].find()).toEqual([]);
//       })
//       .then(done, done.fail);
//   });
//
//   it('works with a transform that returns an array', done => {
//     const factory: TreeTransformFactory<any> = (_options: any) => {
//       return (fem: Tree) => {
//         inner = fem;
//         return [];
//       };
//     };
//
//     let inner: any = null;
//     const desc: SchematicDescription<any> = {
//       name: 'test',
//       description: '',
//       inputs: [
//         'null://',
//         [
//           'null://',
//           { $ref: factory }
//         ]
//       ]
//     };
//
//     const schematic = new Schematic(desc, 'some/path');
//
//     schematic.run({})
//       .toArray()
//       .toPromise()
//       .then(x => {
//         expect(inner.find()).toEqual([]);
//         expect(x.length).toEqual(1);
//       })
//       .then(done, done.fail);
//   });
//
//   it('works with a transform that returns an observable', done => {
//     const factory: TreeTransformFactory<any> = (_options: any) => {
//       return (fem: Tree) => {
//         inner = fem;
//         return Observable.empty();
//       };
//     };
//
//     let inner: any = null;
//     const desc: SchematicDescription<any> = {
//       name: 'test',
//       description: '',
//       inputs: [
//         'null://',
//         [
//           'null://',
//           { $ref: factory }
//         ]
//       ]
//     };
//
//
//     const schematic = new Schematic(desc, 'some/path');
//     schematic.run({})
//       .toArray()
//       .toPromise()
//       .then(x => {
//         expect(inner.find()).toEqual([]);
//         expect(x.length).toEqual(1);
//       })
//       .then(done, done.fail);
//   });
//
// });
