/// <reference path="../../../../../tsd_typings/tsd.d.ts"/>

import {replayEvents} from '../../../src/client/replay/replay_after_hydrate';

describe('replay_after_hydrate', function () {
  describe('replayEvents()', function () {
    it('should do nothing and return empty array if no params', function () {
      let preboot = { dom: {} };
      let strategy = {};
      let events = [];
      let expected = [];
      let actual = replayEvents(preboot, strategy, events);
      expect(actual).toEqual(expected);
    });
    
    it('should dispatch all events w/o checkIfExists', function () {
      let node1 = { name: 'node1', dispatchEvent: function (evt) {} };
      let node2 = { name: 'node2', dispatchEvent: function (evt) {} };
      let preboot = { 
        dom: {
          appContains: function () { return false; }
        } 
      };
      let strategy = {
        checkIfExists: false
      };
      let events = [
        { name: 'evt1', event: { name: 'evt1' }, node: node1 },
        { name: 'evt2', event: { name: 'evt2' }, node: node2 }
      ];
      let expected = [];
      
      spyOn(node1, 'dispatchEvent');
      spyOn(node2, 'dispatchEvent');
      spyOn(preboot.dom, 'appContains');
      
      let actual = replayEvents(preboot, strategy, events);
      expect(actual).toEqual(expected);
      expect(node1.dispatchEvent).toHaveBeenCalledWith(events[0].event);
      expect(node2.dispatchEvent).toHaveBeenCalledWith(events[1].event);
      expect(preboot.dom.appContains).not.toHaveBeenCalled();
    });
    
    it('should checkIfExists and only dispatch on 1 node, return other', function () {
      let node1 = { name: 'node1', dispatchEvent: function (evt) {} };
      let node2 = { name: 'node2', dispatchEvent: function (evt) {} };
      let preboot = { 
        dom: {
          appContains: function (node) {
            return node.name === 'node1';
          }
        }
      };
      let strategy = {
        checkIfExists: true
      };
      let events = [
        { name: 'evt1', event: { name: 'evt1' }, node: node1 },
        { name: 'evt2', event: { name: 'evt2' }, node: node2 }
      ];
      let expected = [
        { name: 'evt2', event: { name: 'evt2' }, node: node2 }
      ];
      
      spyOn(node1, 'dispatchEvent');
      spyOn(node2, 'dispatchEvent');
      spyOn(preboot.dom, 'appContains').and.callThrough();
      
      let actual = replayEvents(preboot, strategy, events);
      expect(actual).toEqual(expected);
      expect(node1.dispatchEvent).toHaveBeenCalledWith(events[0].event);
      expect(node2.dispatchEvent).not.toHaveBeenCalled();
      expect(preboot.dom.appContains).toHaveBeenCalledWith(node1);
      expect(preboot.dom.appContains).toHaveBeenCalledWith(node2);
    });
  });
});
