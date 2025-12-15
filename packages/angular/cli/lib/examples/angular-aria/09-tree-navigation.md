---
title: Navigation Tree
summary: Demonstrates how to create an accessible navigation tree using @angular/aria/tree directives, suitable for file system navigation, folders and document hierarchies, and side navigation with nested sections.
keywords:
  - Tree
  - TreeItem
  - TreeItemGroup
  - Navigation
  - ngTree
  - ngTreeItem
  - ngTreeItemGroup
required_packages:
  - '@angular/aria/tree'
related_concepts:
  - 'Accessibility'
  - 'A11y'
  - 'Navigation'
  - 'UI Patterns'
  - 'Aria'
experimental: true
---

## Purpose

The `@angular/aria/tree` module can be configured to function as a navigation tree, which is a common pattern for website navigation, documentation tables of contents, or file system explorers. By using the `nav` input, the tree's semantics are adjusted to better suit navigation, including the use of `aria-current` to indicate the currently active page or section.

## When to Use

Use the Angular Aria tree directives when you have a hierarchical structure of links or sections that the user needs to navigate. This is ideal for sidebars in documentation sites, nested menus in an application, or any scenario where the tree's primary purpose is to guide the user to different content areas rather than just selecting data.

## Key Concepts

- **Tree**: The main container directive. When the `[nav]="true"` input is used, it adapts its behavior for navigation.
- **TreeItem**: Represents a single link or section in the navigation tree. It will automatically have `aria-current="page"` applied when its `value` matches the `ngTree`'s `value`, indicating the current page.
- **TreeItemGroup**: Used to group related `ngTreeItem` elements, creating collapsible sections in the navigation tree.

## Example Files

This example demonstrates a navigation tree for a simple documentation website.

### tree-navigation-example.ts

This file defines the tree navigation component and the navigation structure.

```typescript
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Tree, TreeItem, TreeItemGroup } from '@angular/aria/tree';

interface NavNode {
  name: string;
  children?: NavNode[];
}

const DOC_STRUCTURE: NavNode[] = [
  { name: 'Introduction' },
  { name: 'Getting Started', children: [{ name: 'Installation' }, { name: 'First Component' }] },
  {
    name: 'Core Concepts',
    children: [
      { name: 'Templates' },
      { name: 'Dependency Injection' },
      { name: 'Lifecycle Hooks' },
    ],
  },
  { name: 'Advanced Topics', children: [{ name: 'Animations' }, { name: 'Internationalization' }] },
];

@Component({
  selector: 'tree-navigation-example',
  templateUrl: 'tree-navigation-example.html',
  styleUrls: ['tree-navigation-example.css'],
  imports: [Tree, TreeItem, TreeItemGroup, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AriaTreeNavigationExample {
  readonly structure = DOC_STRUCTURE;
  currentPage = signal('Installation');
}
```

### tree-navigation-example.html

This template structures the navigation tree and a simulated content area.

```html
<div class="container">
  <nav>
    <ul ngTree [nav]="true" [(value)]="currentPage">
      @for (node of structure; track node.name) {
      <li ngTreeItem [value]="node.name" [parent]="tree">
        {{ node.name }} @if (node.children) {
        <ng-template ngTreeItemGroup [ownedBy]="treeItem">
          <ul ngTreeItemGroupContent>
            @for (child of node.children; track child.name) {
            <li ngTreeItem [value]="child.name" [parent]="treeItemGroup">{{ child.name }}</li>
            }
          </ul>
        </ng-template>
        }
      </li>
      }
    </ul>
  </nav>
  <main>
    <h1>{{ currentPage() }}</h1>
    <p>Content for the "{{ currentPage() }}" page goes here.</p>
  </main>
</div>
```

### tree-navigation-example.css

This file provides styling for the navigation tree and layout.

```css
.container {
  display: flex;
  gap: 20px;
  font-family: sans-serif;
}

nav {
  width: 250px;
  border-right: 1px solid #ccc;
}

[ngTree] {
  list-style: none;
  padding: 0;
  margin: 0;
}

[ngTreeItem] {
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  border-radius: 4px;
}

[ngTreeItem][aria-current='page'] {
  background-color: #d0e0ff;
  font-weight: bold;
}

[ngTreeItem]:not([aria-current='page']):hover {
  background-color: #f0f0f0;
}

[ngTreeItem][aria-expanded='true']::before {
  content: '▼';
  margin-right: 5px;
}

[ngTreeItem][aria-expanded='false']::before {
  content: '►';
  margin-right: 5px;
}

[ngTreeItem][aria-expanded='true'][aria-haspopup='false']::before,
[ngTreeItem][aria-expanded='false'][aria-haspopup='false']::before {
  content: '';
}

[ngTreeItemGroupContent] {
  list-style: none;
  padding-left: 20px;
  margin: 0;
}

main {
  flex-grow: 1;
}
```

## Usage Notes

- The `[nav]="true"` input on the `ngTree` directive is essential for a navigation tree. It changes the tree's semantics to be more appropriate for navigation, including the use of `aria-current`.
- The `[(value)]` binding on `ngTree` tracks the currently selected page. When a `ngTreeItem`'s `value` matches the `ngTree`'s `value`, it is marked as the current page.
- The `aria-current="page"` attribute is automatically applied to the active `ngTreeItem`. You can use this attribute in your CSS to highlight the current page, as shown in the example.
- The `value` input is required for `ngTreeItem`.
