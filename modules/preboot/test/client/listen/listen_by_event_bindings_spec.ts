/// <reference path="../../../../../tsd_typings/tsd.d.ts"/>

import {state, walkDOM, addNodeEvents, getNodeEvents} from '../../../src/client/listen/listen_by_event_bindings';

describe('listen_by_event_bindings', function () {
  describe('walkDOM', function () {
    
    it('should not do anything if no node passed in', function () {
      walkDOM(null, null);    
    });
    
    it('should walk a fake DOM', function () {
      let node4 = {};
      let node3 = { nextSibling: node4 };
      let node2 = { nextSibling: node3 };
      let node1 = { firstChild: node2 };
      let obj = { cb: function () {} };
      
      spyOn(obj, 'cb');
      
      walkDOM(node1, obj.cb);
      
      expect(obj.cb).toHaveBeenCalledWith(node1);
      expect(obj.cb).toHaveBeenCalledWith(node2);
      expect(obj.cb).toHaveBeenCalledWith(node3);
      expect(obj.cb).toHaveBeenCalledWith(node4);
    });
    
  });
  
  describe('addNodeEvents', function () {
    it('should not do anything with no attrs', function () {
      let node = {};
      addNodeEvents(node);
      expect(node).toEqual({});  
    });
    
    it('should add node events', function () {
      let node = {
        attributes: [
          { name: '(click)' },
          { name: 'zoo' },
          { name: 'on-foo' }
        ]
      };
      let expected = [
        { node: node, eventName: 'click' },
        { node: node, eventName: 'foo' }
      ];
      addNodeEvents(node);
      expect(state.nodeEvents).toEqual(expected);
    });
  });
  
  describe('getNodeEvents()', function () {
    it('should return an empty array if no body', function () {
      let preboot = {
        dom: {
          state: {}
        }
      };
      let strategy = {};
      let expected = [];
      let actual = getNodeEvents(preboot, strategy);
      expect(actual).toEqual(expected);
    });  
  });
});
