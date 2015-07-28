/// <reference path="../../../typings/tsd.d.ts"/>
var listen_by_selectors_1 = require('../../../../dist/preboot/src/client/listen/listen_by_selectors');
describe('listen_by_selectors', function () {
    describe('getNodeEvents()', function () {
        it('should return nothing if nothing from query', function () {
            var preboot = {
                dom: {
                    getAllAppNodes: function () { return null; }
                }
            };
            var strategy = {
                eventsBySelector: { 'div.blah': ['evt1', 'evt2'] }
            };
            var expected = [];
            var actual = listen_by_selectors_1.getNodeEvents(preboot, strategy);
            expect(actual).toEqual(expected);
        });
        it('should return node events', function () {
            var preboot = {
                dom: {
                    getAllAppNodes: function () { return [{ name: 'one' }, { name: 'two' }]; }
                }
            };
            var strategy = {
                eventsBySelector: { 'div.blah': ['evt1', 'evt2'] }
            };
            var expected = [
                { node: { name: 'one' }, eventName: 'evt1' },
                { node: { name: 'one' }, eventName: 'evt2' },
                { node: { name: 'two' }, eventName: 'evt1' },
                { node: { name: 'two' }, eventName: 'evt2' }
            ];
            var actual = listen_by_selectors_1.getNodeEvents(preboot, strategy);
            expect(actual).toEqual(expected);
        });
    });
});
//# sourceMappingURL=listen_by_selectors_spec.js.map