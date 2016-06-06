import {replayEvents} from '../../../src/browser/replay/replay_after_hydrate';
import { App, AppState } from '../../../src/interfaces/app';

describe('replay_after_hydrate', function () {
  describe('replayEvents()', function () {
    it('should do nothing and return empty array if no params', function () {
      let app = {
          appContains: function(){}
      };
      
       let appstate: AppState =  { 
           freeze: null,
           appRootName: null, 
           opts: null, 
           canComplete: false, 
           completeCalled: false, 
           started: false
       };
       
      let strategy = {};
      let events = [];
      let expected = [];
      let actual = replayEvents(app, appstate, strategy, events);
      expect(actual).toEqual(expected);
    });
    
    it('should dispatch all events w/o checkIfExists', function () {
      let node1 = { name: 'node1', dispatchEvent: function (evt) {} };
      let node2 = { name: 'node2', dispatchEvent: function (evt) {} };
      let app  = { 
          appContains: function () { return false; }
      };
       let appstate: AppState =  { 
           freeze: null,
           appRootName: 'app', 
           opts: null, 
           canComplete: false, 
           completeCalled: false, 
           started: false
       };
       
      let strategy = {
        checkIfExists: false
      };
      let events = [
        { appName: 'app', name: 'evt1', event: { name: 'evt1' }, node: node1 },
        { appName: 'app', name: 'evt2', event: { name: 'evt2' }, node: node2 }
      ];
      let expected = [];
      
      spyOn(node1, 'dispatchEvent');
      spyOn(node2, 'dispatchEvent');
      spyOn(app, 'appContains');
      
      let actual = replayEvents(app, appstate, strategy, events);
      expect(actual).toEqual(expected);
      expect(node1.dispatchEvent).toHaveBeenCalledWith(events[0].event);
      expect(node2.dispatchEvent).toHaveBeenCalledWith(events[1].event);
      expect(app.appContains).not.toHaveBeenCalled();
    });
    
    it('should checkIfExists and only dispatch on 1 node, return other', function () {
      let node1 = { name: 'node1', dispatchEvent: function (evt) {} };
      let node2 = { name: 'node2', dispatchEvent: function (evt) {} };
      let app = { 
          appContains: function (appstate, node) {
            return node.name === 'node1';
          }
      };
       let appstate: AppState =  { 
           freeze: null,
           appRootName: 'app', 
           opts: null, 
           canComplete: false, 
           completeCalled: false, 
           started: false
       };
      let strategy = {
        checkIfExists: true
      };
      let events = [
        { appName: 'app', name: 'evt1', event: { name: 'evt1' }, node: node1 },
        { appName: 'app', name: 'evt2', event: { name: 'evt2' }, node: node2 }
      ];
      let expected = [
        { appName: 'app', name: 'evt2', event: { name: 'evt2' }, node: node2 }
      ];
      
      spyOn(node1, 'dispatchEvent');
      spyOn(node2, 'dispatchEvent');
      spyOn(app, 'appContains').and.callThrough();
      
      let actual = replayEvents(app, appstate, strategy, events);
      expect(actual).toEqual(expected);
      expect(node1.dispatchEvent).toHaveBeenCalledWith(events[0].event);
      expect(node2.dispatchEvent).not.toHaveBeenCalled();
      expect(app.appContains).toHaveBeenCalledWith(appstate, node1);
      expect(app.appContains).toHaveBeenCalledWith(appstate, node2);
    });
  });
});
