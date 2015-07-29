/// <reference path="../../../typings/tsd.d.ts"/>
var listen_by_attributes_1 = require('../../../../dist/preboot/src/client/listen/listen_by_attributes');
describe('listen_by_attributes', function () {
    describe('getNodeEvents()', function () {
        it('should return nothing if no selection found', function () {
            var preboot = {
                dom: {
                    getAllAppNodes: function () { return null; }
                }
            };
            var strategy = {};
            var expected = [];
            var actual = listen_by_attributes_1.getNodeEvents(preboot, strategy);
            expect(actual).toEqual(expected);
        });
        it('should return node events for elems with attribute', function () {
            var nodes = [
                { name: 'one', getAttribute: function () { return 'yo,mo'; } },
                { name: 'two', getAttribute: function () { return 'shoo,foo'; } }
            ];
            var preboot = {
                dom: {
                    getAllAppNodes: function () { return nodes; }
                }
            };
            var strategy = {};
            var expected = [
                { node: nodes[0], eventName: 'yo' },
                { node: nodes[0], eventName: 'mo' },
                { node: nodes[1], eventName: 'shoo' },
                { node: nodes[1], eventName: 'foo' }
            ];
            var actual = listen_by_attributes_1.getNodeEvents(preboot, strategy);
            expect(actual).toEqual(expected);
        });
    });
});
