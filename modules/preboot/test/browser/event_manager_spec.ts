import * as eventManager from '../../src/browser/event_manager';
import { App, AppState } from '../../src/interfaces/app';
import {Element} from '../../src/interfaces/element';

describe('event_manager', function () {
  describe('getEventHandler()', function () {
    it('should do nothing if not listening', function () {
      let app: App = {};
      let appState: AppState =  { 
           freeze: null,
           appRootName: null, 
           opts: null, 
           canComplete: false, 
           completeCalled: false, 
           started: false
         };
      let strategy = {};
      let node = {};
      let eventName = 'click';
      let event = {};
      
      eventManager.state.listening = false;
      eventManager.getEventHandler(app, appState, strategy, node, eventName)(event);
    });
    
    it('should call preventDefault', function () {
      let app: App = {
         getNodeKey: function(appState: AppState, node: Element, rootNode: Element): string { return ""; }
      };
      let appState: AppState =  { 
           freeze: null,
           appRootName: null, 
           opts: null, 
           canComplete: false, 
           completeCalled: false, 
           started: false
         };
      let strategy = { preventDefault: true };
      let node = {};
      let eventName = 'click';
      let event = { preventDefault: function () {} };
      
      spyOn(event, 'preventDefault');
      eventManager.state.listening = true;
      eventManager.getEventHandler(app, appState, strategy, node, eventName)(event);
      expect(event.preventDefault).toHaveBeenCalled();
    });
    
    it('should dispatch global event', function () {
      let app: App = {
          dispatchGlobalEvent: function () {},
          getNodeKey: function(){ return ""; }
      };
      let appState: AppState =  { 
           freeze: null,
           appRootName: null, 
           opts: null, 
           canComplete: false, 
           completeCalled: false, 
           started: false
         };
      let strategy = { dispatchEvent: 'yo yo yo' };
      let node = {};
      let eventName = 'click';
      let event = {};
      
      spyOn(app, 'dispatchGlobalEvent');
      eventManager.state.listening = true;
      eventManager.getEventHandler(app, appState, strategy, node, eventName)(event);
      expect(app.dispatchGlobalEvent).toHaveBeenCalledWith(appState, strategy.dispatchEvent);
    });
    
    it('should call action', function () {
      let app: App = {
          dispatchGlobalEvent: function () {},
          getNodeKey: function(appState: AppState, node: Element, rootNode: Element): string { return ""; }
      };
      let appState: AppState =  { 
           freeze: null,
           appRootName: null, 
           opts: null, 
           canComplete: false, 
           completeCalled: false, 
           started: false
         };
      let strategy = { action: function () {} };
      let node = {};
      let eventName = 'click';
      let event = {};
      
      spyOn(strategy, 'action');
      eventManager.state.listening = true;
      eventManager.getEventHandler(app, appState, strategy, node, eventName)(event);
      expect(strategy.action).toHaveBeenCalledWith(appState, node, event);
    });
    
    it('should track focus', function () {
     
      let app: App = {
           getNodeKey: function(appState: AppState, node: Element, rootNode: Element): string { return null; }
           
      };
      let appState: AppState =  { 
           freeze: null,
           appRootName: null, 
           opts: null, 
           canComplete: false, 
           completeCalled: false, 
           started: false,
           activeNode: null
         };
         
      let strategy = { trackFocus: true };
      let node = {};
      let eventName = 'focusin';
      let event = { type: 'focusin', target: { name: 'foo' } };
      var expected = {
        node: { name: 'foo' },
        nodeKey: null  
      };  
      
      eventManager.state.listening = true;
      eventManager.getEventHandler(app, appState, strategy, node, eventName)(event);
      expect(appState.activeNode).toEqual(expected);
    });
    
    it('should add to events', function () {
      let expected_time  = new Date().getTime();
      let appName = "app";
      let appState: AppState =  { 
           freeze: null,
           appRootName: appName, 
           opts: null, 
           canComplete: false, 
           completeCalled: false, 
           started: false
         };
         
      let strategy = {};
      let testnode = {};
      let app: App = {
         getNodeKey: function(appState: AppState, node: Element, rootNode: Element): string { return "testnode"; }
      };
      
      let eventName = 'click';
      let event = { type: 'focusin', target: { name: 'foo' }};
      
      eventManager.state.listening = true;
      eventManager.state.events = [];
      eventManager.getEventHandler(app, appState, strategy, testnode, eventName)(event, expected_time);
     
 
      expect(eventManager.state.events).toEqual([{
        node: testnode,
        event: event,
        appName: appName,
        name: eventName,
        time: expected_time,
        nodeKey: "testnode"
      }]); 
    });
    
    it('should not add events if doNotReplay', function () {
      let preboot = { dom: {}, time: (new Date()).getTime() };
      let strategy = { doNotReplay: true };
      let node = {};
      let eventName = 'click';
      let event = { type: 'focusin', target: { name: 'foo' }};
      let app: App = {};
      let appState: AppState =  { 
           freeze: null,
           appRootName: null, 
           opts: null, 
           canComplete: false, 
           completeCalled: false, 
           started: false
         };
         
      eventManager.state.listening = true;
      eventManager.state.events = [];
      eventManager.getEventHandler(app, appState, strategy, node, eventName)(event);
      expect(eventManager.state.events).toEqual([]); 
    });
  });
  
  describe('addEventListeners()', function () {
    it('should add nodeEvents to listeners', function () {
      let nodeEvent1 = { node: { name: 'zoo', addEventListener: function () {} }, eventName: 'foo' };
      let nodeEvent2 = { node: { name: 'shoo', addEventListener: function () {} }, eventName: 'moo' };
      let nodeEvents = [nodeEvent1, nodeEvent2];
      let strategy = {};
      let app: App = {};
      spyOn(nodeEvent1.node, 'addEventListener');
      spyOn(nodeEvent2.node, 'addEventListener');
      
      let appState: AppState =  { 
           freeze: null,
           appRootName: null, 
           opts: null, 
           canComplete: false, 
           completeCalled: false, 
           started: false
         };
         
      eventManager.state.eventListeners = [];
      eventManager.addEventListeners(app, appState, nodeEvents, strategy);
      expect(nodeEvent1.node.addEventListener).toHaveBeenCalled();
      expect(nodeEvent2.node.addEventListener).toHaveBeenCalled();
      expect(eventManager.state.eventListeners.length).toEqual(2);
      expect(eventManager.state.eventListeners[0].name).toEqual(nodeEvent1.eventName);
    });  
  });
  
  describe('startListening()', function () {
    it('should set the listening state', function () {
      let app: App = {};
      let appState: AppState =  { 
           freeze: null,
           appRootName: null, 
           opts: {listen: {}}, 
           canComplete: false, 
           completeCalled: false, 
           started: false
         };
      let opts = { listen: [] };
      
      eventManager.state.listening = false;
      eventManager.startListening(app, appState);
      expect(eventManager.state.listening).toEqual(true);  
    });  
  });
  
  describe('replayEvents()', function () {
    it('should set listening to false', function () {
      let app: App = {};
      let appState: AppState =  { 
           freeze: null,
           appRootName: null, 
           opts: {replay: {}}, 
           canComplete: false, 
           completeCalled: false, 
           started: false
         };
      let opts = { replay: [] };
      let evts = [{ foo: 'choo' }];
      
     // spyOn(preboot, 'log');
      eventManager.state.listening = true;
      eventManager.state.events = evts;
      eventManager.replayEvents(app, appState);
      expect(eventManager.state.listening).toEqual(false);
     // expect(preboot.log).toHaveBeenCalledWith(5, evts);
    });
  });
  
  describe('cleanup()', function () {
    it('should set events to empty array', function () {
      let app: App = {};
      let appState: AppState =  { 
           freeze: null,
           appRootName: null, 
           opts: null, 
           canComplete: false, 
           completeCalled: false, 
           started: false
         };
      let opts = {};
      
      eventManager.state.eventListeners = [];
      eventManager.state.events = [{ foo: 'moo' }];
      eventManager.cleanup(app, appState);
      expect(eventManager.state.events).toEqual([]);
    });
  });
});
