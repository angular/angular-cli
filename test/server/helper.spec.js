var helper = require('../../dist/server/src/helper.js');

describe("Server Helpers", function() {
  describe("helper.selectorRegExpFactory", function() {
    var divRegExp = helper.selectorRegExpFactory('div');

    it("should return an instance of RegExp", function() {
      expect(divRegExp instanceof RegExp).toBe(true);
    });

    it("should match string starting and ending with the given tag", function() {
      expect(divRegExp.test('<div>content</div>')).toBe(true);
    });
  });
});