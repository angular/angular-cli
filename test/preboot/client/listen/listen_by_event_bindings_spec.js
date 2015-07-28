/// <reference path="../../../typings/tsd.d.ts"/>
var listen_by_event_bindings_1 = require('../../../../dist/preboot/src/client/listen/listen_by_event_bindings');
describe('listen_by_event_bindings', function () {
    describe('walkDOM', function () {
        it('should not do anything if no node passed in', function () {
            listen_by_event_bindings_1.walkDOM(null, null);
        });
        it('should walk a fake DOM', function () {
            var node4 = {};
            var node3 = { nextSibling: node4 };
            var node2 = { nextSibling: node3 };
            var node1 = { firstChild: node2 };
            var obj = { cb: function () { } };
            spyOn(obj, 'cb');
            listen_by_event_bindings_1.walkDOM(node1, obj.cb);
            expect(obj.cb).toHaveBeenCalledWith(node1);
            expect(obj.cb).toHaveBeenCalledWith(node2);
            expect(obj.cb).toHaveBeenCalledWith(node3);
            expect(obj.cb).toHaveBeenCalledWith(node4);
        });
    });
    describe('addNodeEvents', function () {
        it('should not do anything with no attrs', function () {
            var node = {};
            listen_by_event_bindings_1.addNodeEvents(node);
            expect(node).toEqual({});
        });
        it('should add node events', function () {
            var node = {
                attributes: [
                    { name: '(click)' },
                    { name: 'zoo' },
                    { name: 'on-foo' }
                ]
            };
            var expected = [
                { node: node, eventName: 'click' },
                { node: node, eventName: 'foo' }
            ];
            listen_by_event_bindings_1.addNodeEvents(node);
            expect(listen_by_event_bindings_1.state.nodeEvents).toEqual(expected);
        });
    });
    describe('getNodeEvents()', function () {
        it('should return an empty array if no body', function () {
            var preboot = {
                dom: {
                    state: {}
                }
            };
            var strategy = {};
            var expected = [];
            var actual = listen_by_event_bindings_1.getNodeEvents(preboot, strategy);
            expect(actual).toEqual(expected);
        });
    });
});
//# sourceMappingURL=listen_by_event_bindings_spec.js.map