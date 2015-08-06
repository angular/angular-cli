/// <reference path="../../../../tsd_typings/tsd.d.ts"/>

import * as eventManager from '../../src/client/event_manager';

describe('event_manager', function () {
  describe('getEventHandler()', function () {
    it('should do nothing if not listening', function () {
      let preboot = { dom: {} };
      let strategy = {};
      let node = {};
      let eventName = 'click';
      let event = {};
      
      eventManager.state.listening = false;
      eventManager.getEventHandler(preboot, strategy, node, eventName)(event);
    });
    
    it('should call preventDefault', function () {
      let preboot = { dom: {} };
      let strategy = { preventDefault: true };
      let node = {};
      let eventName = 'click';
      let event = { preventDefault: function () {} };
      
      spyOn(event, 'preventDefault');
      eventManager.state.listening = true;
      eventManager.getEventHandler(preboot, strategy, node, eventName)(event);
      expect(event.preventDefault).toHaveBeenCalled();
    });
    
    it('should dispatch global event', function () {
      let preboot = { 
        dom: {
          dispatchGlobalEvent: function () {}
        } 
      };
      let strategy = { dispatchEvent: 'yo yo yo' };
      let node = {};
      let eventName = 'click';
      let event = {};
      
      spyOn(preboot.dom, 'dispatchGlobalEvent');
      eventManager.state.listening = true;
      eventManager.getEventHandler(preboot, strategy, node, eventName)(event);
      expect(preboot.dom.dispatchGlobalEvent).toHaveBeenCalledWith(strategy.dispatchEvent);
    });
    
    it('should call action', function () {
      let preboot = { dom: {} };
      let strategy = { action: function () {} };
      let node = {};
      let eventName = 'click';
      let event = {};
      
      spyOn(strategy, 'action');
      eventManager.state.listening = true;
      eventManager.getEventHandler(preboot, strategy, node, eventName)(event);
      expect(strategy.action).toHaveBeenCalledWith(preboot, node, event);
    });
    
    it('should track focus', function () {
      let preboot = { dom: {}, activeNode: null };
      let strategy = { trackFocus: true };
      let node = {};
      let eventName = 'click';
      let event = { type: 'focusin', target: { name: 'foo' }};
      
      eventManager.state.listening = true;
      eventManager.getEventHandler(preboot, strategy, node, eventName)(event);
      expect(preboot.activeNode).toEqual(event.target);
    });
    
    it('should add to events', function () {
      let preboot = { dom: {}, time: (new Date()).getTime() };
      let strategy = {};
      let node = {};
      let eventName = 'click';
      let event = { type: 'focusin', target: { name: 'foo' }};
      
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
      let preboot = { dom: {}, time: (new Date()).getTime() };
      let strategy = { doNotReplay: true };
      let node = {};
      let eventName = 'click';
      let event = { type: 'focusin', target: { name: 'foo' }};
      
      eventManager.state.listening = true;
      eventManager.state.events = [];
      eventManager.getEventHandler(preboot, strategy, node, eventName)(event);
      expect(eventManager.state.events).toEqual([]); 
    });
  });
  
  describe('addEventListeners()', function () {
    it('should add nodeEvents to listeners', function () {
      let preboot = { dom: {} };
      let nodeEvent1 = { node: { name: 'zoo', addEventListener: function () {} }, eventName: 'foo' };
      let nodeEvent2 = { node: { name: 'shoo', addEventListener: function () {} }, eventName: 'moo' };
      let nodeEvents = [nodeEvent1, nodeEvent2];
      let strategy = {};
      
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
      let preboot = { dom: {} };
      let opts = { listen: [] };
      
      eventManager.state.listening = false;
      eventManager.startListening(preboot, opts);
      expect(eventManager.state.listening).toEqual(true);  
    });  
  });
  
  describe('replayEvents()', function () {
    it('should set listening to false', function () {
      let preboot = { dom: {}, log: function () {} };
      let opts = { replay: [] };
      let evts = [{ foo: 'choo' }];
      
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
      let preboot = { dom: {} };
      let opts = {};
      
      eventManager.state.eventListeners = [];
      eventManager.state.events = [{ foo: 'moo' }];
      eventManager.cleanup(preboot, opts);
      expect(eventManager.state.events).toEqual([]);
    });
  });
});
