# Angular @if Control Flow Example

This example demonstrates how to use the `@if` control flow block in an Angular template. The visibility of a `<div>` element is controlled by a boolean field in the component's TypeScript code.

## Angular Template

```html
<!-- The @if directive will only render this div if the 'isVisible' field in the component is true. -->
@if (isVisible) {
<div>This content is conditionally displayed.</div>
}
```

## Component TypeScript

```typescript
import { Component } from '@angular/core';

@Component({
  selector: 'app-example',
  templateUrl: './example.component.html',
  styleUrls: ['./example.component.css'],
})
export class ExampleComponent {
  // This boolean field controls the visibility of the element in the template.
  isVisible: boolean = true;
}
```
