import {stringifyWithFunctions} from '../../src/node/utils';
 /* tslint:disable:eofline no-trailing-whitespace */
 
/**
 * No downstream deps for utils, so easy to test
 */
 describe('utils', function () {
   describe('stringifyWithFunctions', function () {
    it('should do the same thing as stringify if no functions', function () {
      let obj = { foo: 'choo', woo: 'loo', zoo: 5 };
      let expected = JSON.stringify(obj);
      let actual = stringifyWithFunctions(obj);
      expect(actual).toEqual(expected);
    });

    it('should stringify an object with functions', function () {
      let obj = { blah: 'foo', zoo: function (blah) {
          return blah + 1;
      }};
      let expected = '{"blah":"foo","zoo":function (';
      let actual = stringifyWithFunctions(obj);
      expect(actual.substring(0, 30)).toEqual(expected);
    });
   });
 });
