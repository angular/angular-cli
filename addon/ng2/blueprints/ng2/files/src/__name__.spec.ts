/// <reference path="./typings/jasmine/jasmine.d.ts"/>
import {<%= jsComponentName %>App} from './<%= htmlComponentName %>';

describe('Component: <%= jsComponentName %>', () => {
    let app;

    beforeEach(() => {
        app = new <%= jsComponentName %>App();
    });

    it('should have a name', () => {
        expect(app.name).toBe('World');
    });
});