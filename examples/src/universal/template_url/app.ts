import {Component} from '@angular/core';

@Component({
  selector: 'testing',
  providers: [],
  directives: [],
  styles: [`
    #intro {
      background-color: red;
    }
  `],
  templateUrl: '/src/universal/template_url/testing-template.html'
})
export class Testing {

}

@Component({
  selector: 'testing-again',
  providers: [],
  directives: [],
  styles: [`
    #intro {
      background-color: red;
    }
  `],
  templateUrl: '/src/universal/template_url/testing-again-template.html'
})
export class TestingAgain {

}

@Component({
  selector: 'app',
  providers: [],
  directives: [Testing, TestingAgain],
  styles: [`
    #intro {
      background-color: red;
    }
  `],
  templateUrl: '/src/universal/template_url/template.html'
})
export class App {

}
