import { getMockWindow } from '../preboot_test_utils';
import {
  getInlineCode,
  assign,
  stringifyWithFunctions
} from '../../src/node/preboot_node';

describe('node unit test for preboot_node', function () {
  describe('assign()', function () {
    it('should merge two objects', function () {
      let obj1 = { val1: 'foo', val2: 'choo' };
      let obj2 = { val2: 'moo', val3: 'zoo' };
      let expected = { val1: 'foo', val2: 'moo', val3: 'zoo' };
      let actual = assign(obj1, obj2);
      expect(actual).toEqual(expected);
    });
  });

  describe('stringifyWithFunctions()', function () {
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

  describe('getInlineCode()', function () {
    it('should generate valid JavaScript by default', function () {
      let code = getInlineCode({
        window: getMockWindow(),
        appRoot: 'app'
      });

      // code should exist
      expect(code).toBeTruthy();

      /* tslint:disable:no-eval */
      // try to eval the code (if error, then test will fail)
      eval(code);
    });
  });
});
