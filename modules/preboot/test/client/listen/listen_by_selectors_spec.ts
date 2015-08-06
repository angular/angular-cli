/// <reference path="../../../../../tsd_typings/tsd.d.ts"/>

import {getNodeEvents} from '../../../src/client/listen/listen_by_selectors';

describe('listen_by_selectors', function () {
  describe('getNodeEvents()', function () {
    it('should return nothing if nothing from query', function () {
      let preboot = {
        dom: {
          getAllAppNodes: () => null
        }
      };
      let strategy = {
        eventsBySelector: { 'div.blah': ['evt1', 'evt2'] }
      };
      let expected = [];
      let actual = getNodeEvents(preboot, strategy);
      expect(actual).toEqual(expected);
    });
    
    it('should return node events', function () {
      let preboot = {
        dom: {
          getAllAppNodes: () => [{ name: 'one' }, { name: 'two' }]
        }
      };
      let strategy = {
        eventsBySelector: { 'div.blah': ['evt1', 'evt2'] }
      };
      let expected = [
        { node: { name: 'one' }, eventName: 'evt1' },
        { node: { name: 'one' }, eventName: 'evt2' },
        { node: { name: 'two' }, eventName: 'evt1' },
        { node: { name: 'two' }, eventName: 'evt2' }
      ];
      let actual = getNodeEvents(preboot, strategy);
      expect(actual).toEqual(expected);
    }); 
  });
});
