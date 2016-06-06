import {getNodeEvents} from '../../../src/browser/listen/listen_by_attributes';
import { AppState } from '../../../src/interfaces/app';


describe('listen_by_attributes', function () {
  describe('getNodeEvents()', function () {

    it('should return nothing if no selection found', function () {
      let app = {
          getAllAppNodes: function () { return null; }
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
      let expected = [];
      let actual = getNodeEvents(app, appstate, strategy);
      expect(actual).toEqual(expected);
    });
    
    it('should return node events for elems with attribute', function () {
      let nodes = [
        { name: 'one', getAttribute: function () { return 'yo,mo'; }},
        { name: 'two', getAttribute: function () { return 'shoo,foo'; }}
      ];
      let app = {
          getAllAppNodes: function () { return nodes; }
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
      let expected = [
        { node: nodes[0], eventName: 'yo' },
        { node: nodes[0], eventName: 'mo' },
        { node: nodes[1], eventName: 'shoo' },
        { node: nodes[1], eventName: 'foo' }
      ];
      let actual = getNodeEvents(app, appstate, strategy);
      expect(actual).toEqual(expected);
    });

  });
});
