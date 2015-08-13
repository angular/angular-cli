/// <reference path="../../../tsd_typings/tsd.d.ts"/>
import {selectorRegExpFactory} from '../src/helper.js';

describe('Server Helpers', () => {

  describe('helper.selectorRegExpFactory', () => {
    var subject;
    var result;

    it('should return an instance of RegExp', () => {
      var divRegExp = selectorRegExpFactory('div');
      subject = divRegExp instanceof RegExp;
      result  = true;

      expect(subject).toBe(result);
    });

    it('should match string starting and ending with the given tag', () => {
      subject = selectorRegExpFactory('div').test('<div>content</div>');
      result  = true;

      expect(subject).toBe(result);
    });

  });
});
