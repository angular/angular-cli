import { Component } from '@angular/core';


@Component({
	selector: 'app',
	template: `
		<div>
			Hello World
		</div>
	`
})
export class App {
	constructor() {
		console.log('hello from App');
	}
}
