import {state, prep, cleanup} from '../../../src/browser/freeze/freeze_with_spinner';

describe('freeze_with_spinner', function () {
  describe('cleanup()', function () {
    it('should call removeNode and null out overlay and spinner', function () {
      let preboot = { dom: { removeNode: null } };
      
      state.overlay = 'boo';
      state.spinner = 'food';
      spyOn(preboot.dom, 'removeNode');
      
      cleanup(preboot);
      
      expect(preboot.dom.removeNode).toHaveBeenCalledWith('boo');
      expect(preboot.dom.removeNode).toHaveBeenCalledWith('food');
      expect(state.overlay).toBeNull();
      expect(state.spinner).toBeNull();
    });  
  });
  
  describe('prep()', function () {
    it('should call preboot fns trying to freeze UI', function () {
      let preboot = { 
        dom: {
          addNodeToBody: function () { return { style: {} }; },
          on: function () {},
          removeNode: function () {}
        }
      };
      let opts = {};
      
      spyOn(preboot.dom, 'addNodeToBody');
      spyOn(preboot.dom, 'on');
      spyOn(preboot.dom, 'removeNode');
      
      prep(preboot, opts);
      
      expect(preboot.dom.addNodeToBody).toHaveBeenCalled();
      expect(preboot.dom.on).toHaveBeenCalled();
    });
  });
});
