import {getNodeEvents} from '../../../src/browser/listen/listen_by_selectors';
import { AppState } from '../../../src/interfaces/app';

describe('listen_by_selectors', function () {
  describe('getNodeEvents()', function () {
    it('should return nothing if nothing from query', function () {
      let app = {
          getAllAppNodes: () => null
      };
       let appstate: AppState =  { 
           freeze: null,
           appRootName: null, 
           opts: null, 
           canComplete: false, 
           completeCalled: false, 
           started: false
       };
      let strategy = {
        eventsBySelector: { 'div.blah': ['evt1', 'evt2'] }
      };
      let expected = [];
      let actual = getNodeEvents(app, appstate, strategy);
      expect(actual).toEqual(expected);
    });
    
    it('should return node events', function () {
       let app = {
          getAllAppNodes: () => [{ name: 'one' }, { name: 'two' }]
      };
       let appstate: AppState =  { 
           freeze: null,
           appRootName: null, 
           opts: null, 
           canComplete: false, 
           completeCalled: false, 
           started: false
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
      let actual = getNodeEvents(app, appstate, strategy);
      expect(actual).toEqual(expected);
    }); 
  });
});
