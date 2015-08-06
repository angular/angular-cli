/// <reference path="../../../../../tsd_typings/tsd.d.ts"/>

import {replayEvents} from '../../../src/client/replay/replay_after_rerender';

describe('replay_after_rerender', function () {
  describe('replayEvents()', function () {
    it('should do nothing and return empty array if no params', function () {
      let preboot = { dom: {} };
      let strategy = {};
      let events = [];
      let expected = [];
      let actual = replayEvents(preboot, strategy, events);
      expect(actual).toEqual(expected);
    });
    
    it('should dispatch all events', function () {
      let node1 = { name: 'node1', dispatchEvent: function (evt) {} };
      let node2 = { name: 'node2', dispatchEvent: function (evt) {} };
      let preboot = { 
        dom: {
          findClientNode: function (node) { return node; }
        },
        log: function () {}
      };
      let strategy = {};
      let events = [
        { name: 'evt1', event: { name: 'evt1' }, node: node1 },
        { name: 'evt2', event: { name: 'evt2' }, node: node2 }
      ];
      let expected = [];
      
      spyOn(node1, 'dispatchEvent');
      spyOn(node2, 'dispatchEvent');
      spyOn(preboot.dom, 'findClientNode').and.callThrough();
      spyOn(preboot, 'log');
      
      let actual = replayEvents(preboot, strategy, events);
      expect(actual).toEqual(expected);
      expect(node1.dispatchEvent).toHaveBeenCalledWith(events[0].event);
      expect(node2.dispatchEvent).toHaveBeenCalledWith(events[1].event);
      expect(preboot.dom.findClientNode).toHaveBeenCalledWith(node1);
      expect(preboot.dom.findClientNode).toHaveBeenCalledWith(node2);
      expect(preboot.log).toHaveBeenCalledWith(3, node1, node1, events[0].event);
      expect(preboot.log).toHaveBeenCalledWith(3, node2, node2, events[1].event);
    });
    
    it('should dispatch one event and return the other', function () {
      let node1 = { name: 'node1', dispatchEvent: function (evt) {} };
      let node2 = { name: 'node2', dispatchEvent: function (evt) {} };
      let preboot = { 
        dom: {
          findClientNode: function (node) { 
            return node.name === 'node1' ? node : null; 
          }
        },
        log: function () {}
      };
      let strategy = {};
      let events = [
        { name: 'evt1', event: { name: 'evt1' }, node: node1 },
        { name: 'evt2', event: { name: 'evt2' }, node: node2 }
      ];
      let expected = [
        { name: 'evt2', event: { name: 'evt2' }, node: node2 }
      ];
      
      spyOn(node1, 'dispatchEvent');
      spyOn(node2, 'dispatchEvent');
      spyOn(preboot.dom, 'findClientNode').and.callThrough();
      spyOn(preboot, 'log');
      
      let actual = replayEvents(preboot, strategy, events);
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
