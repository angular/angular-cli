import {state, prep, cleanup} from '../../../src/browser/freeze/freeze_with_spinner';
import { App, AppState } from '../../../src/interfaces/app';
import { Element } from '../../../src/interfaces/element';

describe('freeze_with_spinner', function () {
  describe('cleanup()', function () {
    it('should call removeNode and null out overlay and spinner', function () {
      let app: App =  { removeNode: null };
      
      let appState: AppState =  { 
           freeze: null,
           appRootName: null, 
           opts: null, 
           canComplete: false, 
           completeCalled: false, 
           started: false
         };
         
      state.overlay = 'boo';
      state.spinner = 'food';
      spyOn(app, 'removeNode');
      
      cleanup(app, appState);
      
      expect(app.removeNode).toHaveBeenCalledWith('boo');
      expect(app.removeNode).toHaveBeenCalledWith('food');
      expect(state.overlay).toBeNull();
      expect(state.spinner).toBeNull();
    });  
  });
  
  describe('prep()', function () {
    it('should call preboot fns trying to freeze UI', function () {
      let app: App = {
          addNodeToBody: function (app: AppState, type: string, className: string, styles: Object): Element { 
            return { style: { display: "" } }; 
          },
          on: function () {},
          removeNode: function () {}
      };
      
      
      let appState: AppState =  { 
           freeze: null,
           appRootName: null, 
           opts: {}, 
           canComplete: false, 
           completeCalled: false, 
           started: false
         };
         
   
      
      spyOn(app, 'addNodeToBody');
      spyOn(app, 'on');
      spyOn(app, 'removeNode');
      
      prep(app, appState);
      
      expect(app.addNodeToBody).toHaveBeenCalled();
      expect(app.on).toHaveBeenCalled();
    });
  });
});
