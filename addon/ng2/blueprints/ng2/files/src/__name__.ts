/// <reference path="./typings/angular2/angular2.d.ts"/>
import {Component, View, bootstrap} from 'angular2/angular2';

@Component({
    selector: '<%= htmlComponentName %>-app',
    injectables: []})
@View({
    templateUrl: '<%= htmlComponentName %>.html',
    directives: []
})
export class <%= jsComponentName %>App {
    name: string;

    constructor() {
        this.name = 'World';
    }
}
bootstrap(<%= jsComponentName %>App);