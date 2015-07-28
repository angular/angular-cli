/// <reference path="../../../typings/tsd.d.ts"/>
var freeze_with_spinner_1 = require('../../../../dist/preboot/src/client/freeze/freeze_with_spinner');
describe('freeze_with_spinner', function () {
    describe('cleanup()', function () {
        it('should call removeNode and null out overlay and spinner', function () {
            var preboot = { dom: { removeNode: null } };
            freeze_with_spinner_1.state.overlay = 'boo';
            freeze_with_spinner_1.state.spinner = 'food';
            spyOn(preboot.dom, 'removeNode');
            freeze_with_spinner_1.cleanup(preboot);
            expect(preboot.dom.removeNode).toHaveBeenCalledWith('boo');
            expect(preboot.dom.removeNode).toHaveBeenCalledWith('food');
            expect(freeze_with_spinner_1.state.overlay).toBeNull();
            expect(freeze_with_spinner_1.state.spinner).toBeNull();
        });
    });
    describe('prep()', function () {
        it('should call preboot fns trying to freeze UI', function () {
            var preboot = {
                dom: {
                    addNodeToBody: function () { return { style: {} }; },
                    on: function () { },
                    removeNode: function () { }
                }
            };
            var opts = {};
            spyOn(preboot.dom, 'addNodeToBody');
            spyOn(preboot.dom, 'on');
            spyOn(preboot.dom, 'removeNode');
            freeze_with_spinner_1.prep(preboot, opts);
            expect(preboot.dom.addNodeToBody).toHaveBeenCalled();
            expect(preboot.dom.on).toHaveBeenCalled();
        });
    });
});
//# sourceMappingURL=freeze_with_spinner_spec.js.map