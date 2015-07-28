var utils_1 = require('../../../dist/preboot/src/server/utils');
/* tslint:disable:eofline no-trailing-whitespace */
/**
 * No downstream deps for utils, so easy to test
 */
describe('utils', function () {
    describe('stringifyWithFunctions', function () {
        it('should do the same thing as stringify if no functions', function () {
            var obj = { foo: 'choo', woo: 'loo', zoo: 5 };
            var expected = JSON.stringify(obj);
            var actual = utils_1.stringifyWithFunctions(obj);
            expect(actual).toEqual(expected);
        });
        it('should stringify an object with functions', function () {
            var obj = { blah: 'foo', zoo: function (blah) {
                    return blah + 1;
                } };
            var expected = '{"blah":"foo","zoo":function (';
            var actual = utils_1.stringifyWithFunctions(obj);
            expect(actual.substring(0, 30)).toEqual(expected);
        });
    });
});
