import {replayEvents} from '../../../src/browser/replay/replay_after_rerender';
import { App, AppState } from '../../../src/interfaces/app';

describe('replay_after_rerender', function () {
  describe('replayEvents()', function () {
    it('should do nothing and return empty array if no params', function () {

      let app = {
          findClientNode: function (node) { return node; },
          log: function () {}
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

    it('should dispatch all events', function () {
      let node1 = { appName: 'app', name: 'node1', dispatchEvent: function (evt) {} };
      let node2 = { appName: 'app', name: 'node2', dispatchEvent: function (evt) {} };
      let app = {
          findClientNode: function (app, node, key  ) { return node; },
          log: function () {}
      };
       let appstate: AppState =  { 
           freeze: null,
           appRootName: 'app', 
           opts: null, 
           canComplete: false, 
           completeCalled: false, 
           started: false
       };
       
      let strategy = {};
      let events = [
        { appName: 'app', name: 'evt1', event: { name: 'evt1' }, node: node1, nodeKey: 'node1' },
        { appName: 'app', name: 'evt2', event: { name: 'evt2' }, node: node2, nodeKey: 'node2' }
      ];
      let expected = [];

      spyOn(node1, 'dispatchEvent');
      spyOn(node2, 'dispatchEvent');
      spyOn(app, 'findClientNode').and.callThrough();
    // spyOn(app, 'log');

      let actual = replayEvents(app, appstate, strategy, events);
      expect(actual).toEqual(expected);
      expect(node1.dispatchEvent).toHaveBeenCalledWith(events[0].event);
      expect(node2.dispatchEvent).toHaveBeenCalledWith(events[1].event);
      expect(app.findClientNode).toHaveBeenCalledWith(appstate, node1, 'node1');
      expect(app.findClientNode).toHaveBeenCalledWith(appstate, node2, 'node2');
     // expect(app.log).toHaveBeenCalledWith(3, node1, node1, events[0].event);
     // expect(app.log).toHaveBeenCalledWith(3, node2, node2, events[1].event);
    });

    it('should dispatch one event and return the other', function () {
      let node1 = { appName: 'app', name: 'node1', dispatchEvent: function (evt) {} };
      let node2 = { appName: 'app', name: 'node2', dispatchEvent: function (evt) {} };

      let app = {
          findClientNode: function (app, servernode, nodekey) {
            return servernode.name === 'node1' ? servernode : null;
          },
          log: function () {}
      };
       let appstate: AppState =  { 
           freeze: null,
           appRootName: 'app', 
           opts: null, 
           canComplete: false, 
           completeCalled: false, 
           started: false
       };
       
      let strategy = {};
      let events = [
        { appName: 'app', name: 'evt1', event: { name: 'evt1' }, node: node1, nodeKey: 'node1' },
        { appName: 'app', name: 'evt2', event: { name: 'evt2' }, node: node2, nodeKey: 'node2' }
      ];
      let expected = [
        { appName: 'app', name: 'evt2', event: { name: 'evt2' }, node: node2, nodeKey: 'node2' }
      ];

      spyOn(node1, 'dispatchEvent');
      spyOn(node2, 'dispatchEvent');
      spyOn(app, 'findClientNode').and.callThrough();
     // spyOn(preboot, 'log');

      let actual = replayEvents(app, appstate, strategy, events);
      expect(actual).toEqual(expected);
      expect(node1.dispatchEvent).toHaveBeenCalledWith(events[0].event);
      expect(node2.dispatchEvent).not.toHaveBeenCalled();
      expect(app.findClientNode).toHaveBeenCalledWith(appstate, node1, 'node1');
      expect(app.findClientNode).toHaveBeenCalledWith(appstate, node2, 'node2');
     // expect(preboot.log).toHaveBeenCalledWith(3, node1, node1, events[0].event);
     // expect(preboot.log).toHaveBeenCalledWith(4, node2);
    });
  });
});
