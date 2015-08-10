var helper = require('../../dist/modules/server/src/helper.js');

describe("Server Helpers", function() {
  describe("helper.selectorRegExpFactory", function() {
    var subject;
    var result;

    it("should return an instance of RegExp", function() {
      var divRegExp = helper.selectorRegExpFactory('div');
      subject = divRegExp instanceof RegExp;
      result  = true;

      expect(subject).toBe(result);
    });

    it("should match string starting and ending with the given tag", function() {
      subject = helper.selectorRegExpFactory('div').test('<div>content</div>');
      result  = true;

      expect(subject).toBe(result);
    });
  });
});
