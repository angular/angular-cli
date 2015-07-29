/// <reference path="../../typings/tsd.d.ts"/>
var eventManager = require('../../../dist/preboot/src/client/event_manager');
describe('event_manager', function () {
    describe('getEventHandler()', function () {
        it('should do nothing if not listening', function () {
            var preboot = { dom: {} };
            var strategy = {};
            var node = {};
            var eventName = 'click';
            var event = {};
            eventManager.state.listening = false;
            eventManager.getEventHandler(preboot, strategy, node, eventName)(event);
        });
        it('should call preventDefault', function () {
            var preboot = { dom: {} };
            var strategy = { preventDefault: true };
            var node = {};
            var eventName = 'click';
            var event = { preventDefault: function () { } };
            spyOn(event, 'preventDefault');
            eventManager.state.listening = true;
            eventManager.getEventHandler(preboot, strategy, node, eventName)(event);
            expect(event.preventDefault).toHaveBeenCalled();
        });
        it('should dispatch global event', function () {
            var preboot = {
                dom: {
                    dispatchGlobalEvent: function () { }
                }
            };
            var strategy = { dispatchEvent: 'yo yo yo' };
            var node = {};
            var eventName = 'click';
            var event = {};
            spyOn(preboot.dom, 'dispatchGlobalEvent');
            eventManager.state.listening = true;
            eventManager.getEventHandler(preboot, strategy, node, eventName)(event);
            expect(preboot.dom.dispatchGlobalEvent).toHaveBeenCalledWith(strategy.dispatchEvent);
        });
        it('should call action', function () {
            var preboot = { dom: {} };
            var strategy = { action: function () { } };
            var node = {};
            var eventName = 'click';
            var event = {};
            spyOn(strategy, 'action');
            eventManager.state.listening = true;
            eventManager.getEventHandler(preboot, strategy, node, eventName)(event);
            expect(strategy.action).toHaveBeenCalledWith(preboot, node, event);
        });
        it('should track focus', function () {
            var preboot = { dom: {}, activeNode: null };
            var strategy = { trackFocus: true };
            var node = {};
            var eventName = 'click';
            var event = { type: 'focusin', target: { name: 'foo' } };
            eventManager.state.listening = true;
            eventManager.getEventHandler(preboot, strategy, node, eventName)(event);
            expect(preboot.activeNode).toEqual(event.target);
        });
        it('should add to events', function () {
            var preboot = { dom: {}, time: (new Date()).getTime() };
            var strategy = {};
            var node = {};
            var eventName = 'click';
            var event = { type: 'focusin', target: { name: 'foo' } };
            eventManager.state.listening = true;
            eventManager.state.events = [];
            eventManager.getEventHandler(preboot, strategy, node, eventName)(event);
            expect(eventManager.state.events).toEqual([{
                    node: node,
                    event: event,
                    name: eventName,
                    time: preboot.time
                }]);
        });
        it('should not add events if doNotReplay', function () {
            var preboot = { dom: {}, time: (new Date()).getTime() };
            var strategy = { doNotReplay: true };
            var node = {};
            var eventName = 'click';
            var event = { type: 'focusin', target: { name: 'foo' } };
            eventManager.state.listening = true;
            eventManager.state.events = [];
            eventManager.getEventHandler(preboot, strategy, node, eventName)(event);
            expect(eventManager.state.events).toEqual([]);
        });
    });
    describe('addEventListeners()', function () {
        it('should add nodeEvents to listeners', function () {
            var preboot = { dom: {} };
            var nodeEvent1 = { node: { name: 'zoo', addEventListener: function () { } }, eventName: 'foo' };
            var nodeEvent2 = { node: { name: 'shoo', addEventListener: function () { } }, eventName: 'moo' };
            var nodeEvents = [nodeEvent1, nodeEvent2];
            var strategy = {};
            spyOn(nodeEvent1.node, 'addEventListener');
            spyOn(nodeEvent2.node, 'addEventListener');
            eventManager.state.eventListeners = [];
            eventManager.addEventListeners(preboot, nodeEvents, strategy);
            expect(nodeEvent1.node.addEventListener).toHaveBeenCalled();
            expect(nodeEvent2.node.addEventListener).toHaveBeenCalled();
            expect(eventManager.state.eventListeners.length).toEqual(2);
            expect(eventManager.state.eventListeners[0].name).toEqual(nodeEvent1.eventName);
        });
    });
    describe('startListening()', function () {
        it('should set the listening state', function () {
            var preboot = { dom: {} };
            var opts = { listen: [] };
            eventManager.state.listening = false;
            eventManager.startListening(preboot, opts);
            expect(eventManager.state.listening).toEqual(true);
        });
    });
    describe('replayEvents()', function () {
        it('should set listening to false', function () {
            var preboot = { dom: {}, log: function () { } };
            var opts = { replay: [] };
            var evts = [{ foo: 'choo' }];
            spyOn(preboot, 'log');
            eventManager.state.listening = true;
            eventManager.state.events = evts;
            eventManager.replayEvents(preboot, opts);
            expect(eventManager.state.listening).toEqual(false);
            expect(preboot.log).toHaveBeenCalledWith(5, evts);
        });
    });
    describe('cleanup()', function () {
        it('should set events to empty array', function () {
            var preboot = { dom: {} };
            var opts = {};
            eventManager.state.eventListeners = [];
            eventManager.state.events = [{ foo: 'moo' }];
            eventManager.cleanup(preboot, opts);
            expect(eventManager.state.events).toEqual([]);
        });
    });
});
