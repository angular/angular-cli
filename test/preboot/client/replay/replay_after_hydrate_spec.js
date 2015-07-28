/// <reference path="../../../typings/tsd.d.ts"/>
var replay_after_hydrate_1 = require('../../../../dist/preboot/src/client/replay/replay_after_hydrate');
describe('replay_after_hydrate', function () {
    describe('replayEvents()', function () {
        it('should do nothing and return empty array if no params', function () {
            var preboot = { dom: {} };
            var strategy = {};
            var events = [];
            var expected = [];
            var actual = replay_after_hydrate_1.replayEvents(preboot, strategy, events);
            expect(actual).toEqual(expected);
        });
        it('should dispatch all events w/o checkIfExists', function () {
            var node1 = { name: 'node1', dispatchEvent: function (evt) { } };
            var node2 = { name: 'node2', dispatchEvent: function (evt) { } };
            var preboot = {
                dom: {
                    appContains: function () { return false; }
                }
            };
            var strategy = {
                checkIfExists: false
            };
            var events = [
                { name: 'evt1', event: { name: 'evt1' }, node: node1 },
                { name: 'evt2', event: { name: 'evt2' }, node: node2 }
            ];
            var expected = [];
            spyOn(node1, 'dispatchEvent');
            spyOn(node2, 'dispatchEvent');
            spyOn(preboot.dom, 'appContains');
            var actual = replay_after_hydrate_1.replayEvents(preboot, strategy, events);
            expect(actual).toEqual(expected);
            expect(node1.dispatchEvent).toHaveBeenCalledWith(events[0].event);
            expect(node2.dispatchEvent).toHaveBeenCalledWith(events[1].event);
            expect(preboot.dom.appContains).not.toHaveBeenCalled();
        });
        it('should checkIfExists and only dispatch on 1 node, return other', function () {
            var node1 = { name: 'node1', dispatchEvent: function (evt) { } };
            var node2 = { name: 'node2', dispatchEvent: function (evt) { } };
            var preboot = {
                dom: {
                    appContains: function (node) {
                        return node.name === 'node1';
                    }
                }
            };
            var strategy = {
                checkIfExists: true
            };
            var events = [
                { name: 'evt1', event: { name: 'evt1' }, node: node1 },
                { name: 'evt2', event: { name: 'evt2' }, node: node2 }
            ];
            var expected = [
                { name: 'evt2', event: { name: 'evt2' }, node: node2 }
            ];
            spyOn(node1, 'dispatchEvent');
            spyOn(node2, 'dispatchEvent');
            spyOn(preboot.dom, 'appContains').and.callThrough();
            var actual = replay_after_hydrate_1.replayEvents(preboot, strategy, events);
            expect(actual).toEqual(expected);
            expect(node1.dispatchEvent).toHaveBeenCalledWith(events[0].event);
            expect(node2.dispatchEvent).not.toHaveBeenCalled();
            expect(preboot.dom.appContains).toHaveBeenCalledWith(node1);
            expect(preboot.dom.appContains).toHaveBeenCalledWith(node2);
        });
    });
});
//# sourceMappingURL=replay_after_hydrate_spec.js.map