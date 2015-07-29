/// <reference path="../../../typings/tsd.d.ts"/>
var replay_after_rerender_1 = require('../../../../dist/preboot/src/client/replay/replay_after_rerender');
describe('replay_after_rerender', function () {
    describe('replayEvents()', function () {
        it('should do nothing and return empty array if no params', function () {
            var preboot = { dom: {} };
            var strategy = {};
            var events = [];
            var expected = [];
            var actual = replay_after_rerender_1.replayEvents(preboot, strategy, events);
            expect(actual).toEqual(expected);
        });
        it('should dispatch all events', function () {
            var node1 = { name: 'node1', dispatchEvent: function (evt) { } };
            var node2 = { name: 'node2', dispatchEvent: function (evt) { } };
            var preboot = {
                dom: {
                    findClientNode: function (node) { return node; }
                },
                log: function () { }
            };
            var strategy = {};
            var events = [
                { name: 'evt1', event: { name: 'evt1' }, node: node1 },
                { name: 'evt2', event: { name: 'evt2' }, node: node2 }
            ];
            var expected = [];
            spyOn(node1, 'dispatchEvent');
            spyOn(node2, 'dispatchEvent');
            spyOn(preboot.dom, 'findClientNode').and.callThrough();
            spyOn(preboot, 'log');
            var actual = replay_after_rerender_1.replayEvents(preboot, strategy, events);
            expect(actual).toEqual(expected);
            expect(node1.dispatchEvent).toHaveBeenCalledWith(events[0].event);
            expect(node2.dispatchEvent).toHaveBeenCalledWith(events[1].event);
            expect(preboot.dom.findClientNode).toHaveBeenCalledWith(node1);
            expect(preboot.dom.findClientNode).toHaveBeenCalledWith(node2);
            expect(preboot.log).toHaveBeenCalledWith(3, node1, node1, events[0].event);
            expect(preboot.log).toHaveBeenCalledWith(3, node2, node2, events[1].event);
        });
        it('should dispatch one event and return the other', function () {
            var node1 = { name: 'node1', dispatchEvent: function (evt) { } };
            var node2 = { name: 'node2', dispatchEvent: function (evt) { } };
            var preboot = {
                dom: {
                    findClientNode: function (node) {
                        return node.name === 'node1' ? node : null;
                    }
                },
                log: function () { }
            };
            var strategy = {};
            var events = [
                { name: 'evt1', event: { name: 'evt1' }, node: node1 },
                { name: 'evt2', event: { name: 'evt2' }, node: node2 }
            ];
            var expected = [
                { name: 'evt2', event: { name: 'evt2' }, node: node2 }
            ];
            spyOn(node1, 'dispatchEvent');
            spyOn(node2, 'dispatchEvent');
            spyOn(preboot.dom, 'findClientNode').and.callThrough();
            spyOn(preboot, 'log');
            var actual = replay_after_rerender_1.replayEvents(preboot, strategy, events);
            expect(actual).toEqual(expected);
            expect(node1.dispatchEvent).toHaveBeenCalledWith(events[0].event);
            expect(node2.dispatchEvent).not.toHaveBeenCalled();
            expect(preboot.dom.findClientNode).toHaveBeenCalledWith(node1);
            expect(preboot.dom.findClientNode).toHaveBeenCalledWith(node2);
            expect(preboot.log).toHaveBeenCalledWith(3, node1, node1, events[0].event);
            expect(preboot.log).toHaveBeenCalledWith(4, node2);
        });
    });
});
