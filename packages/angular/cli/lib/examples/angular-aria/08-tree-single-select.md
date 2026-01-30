---
title: Single-Select Tree
summary: Demonstrates how to create an accessible single-select tree component using @angular/aria/tree directives.
keywords:
  - Tree
  - TreeItem
  - TreeItemGroup
  - ngTree
  - ngTreeItem
  - ngTreeItemGroup
  - Single selection
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

The `@angular/aria/tree` module provides directives for building accessible tree view components. A tree view is a hierarchical list of data where items can expand to reveal children or collapse to hide them. This example focuses on a single-selection tree, where only one item can be active at a time.

## When to Use

Use the Angular Aria tree directives when you need to display hierarchical data where users need to select a single item from a nested list. This is ideal for file browsers, organizational charts, navigation menus with nested categories, or any scenario where a clear parent-child relationship exists between items and only one selection is allowed.

## Key Concepts

- **Tree**: The main container directive for the tree view. It applies the `tree` ARIA role and manages the overall state and navigation of the tree.
- **TreeItem**: A directive applied to individual items within the tree. It applies the `treeitem` ARIA role and handles selection, expansion, and focus for that item.
- **TreeItemGroup**: A directive applied to an `ng-template` that contains child `ngTreeItem` elements. It represents a collapsible group of items within the tree.

## Example Files

This example demonstrates a single-select tree for navigating a file system structure.

### tree-single-select-example.ts

This file defines the single-select tree component, provides a TreeNode type and example data, and manages the selected tree item.

```typescript
import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Tree, TreeItem, TreeItemGroup } from '@angular/aria/tree';

export type TreeNode = {
  name: string;
  value: string;
  children?: TreeNode[];
  disabled?: boolean;
  expanded?: boolean;
};

const NODES: TreeNode[] = [
  {
    name: 'Pitted Fruits',
    value: 'pitted-group',
    children: [
      { name: 'Peach', value: 'peach-item' },
      { name: 'Plum', value: 'plum-item' },
    ],
    expanded: true,
  },
  {
    name: 'Grapes',
    value: 'grape-group',
    children: [
      {
        name: 'Green Grapes',
        value: 'green-grapes',
        children: [
          { name: 'Thompson Seedless', value: 'thompson-item' },
          { name: 'Cotton Candy', value: 'cotton-candy-item', disabled: true },
        ],
      },
      {
        name: 'Red Grapes',
        value: 'red-grapes',
        children: [{ name: 'Crimson Seedless', value: 'crimson-item' }],
      },
    ],
    expanded: true,
  },
  { name: 'Kiwi', value: 'kiwi-item' },
];

@Component({
  selector: 'tree-single-select-example',
  templateUrl: 'tree-single-select-example.html',
  styleUrls: ['tree-single-select-example.css'],
  imports: [Tree, TreeItem, TreeItemGroup, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AriaTreeSingleSelectExample {
  nodes: TreeNode[] = NODES;

  readonly selected = signal(['peach-item']);
}
```

### tree-single-select-example.html

This template structures the tree with nested items and groups.

```html
<ul ngTree #tree="ngTree" [(values)]="selected" [multi]="false">
  <ng-template
    [ngTemplateOutlet]="treeNodes"
    [ngTemplateOutletContext]="{nodes: nodes, parent: tree}"
  />
</ul>

<ng-template #treeNodes let-nodes="nodes" let-parent="parent">
  @for (node of nodes; track node.value) {
  <li
    ngTreeItem
    [parent]="parent"
    [value]="node.value"
    [label]="node.name"
    [disabled]="node.disabled"
    [(expanded)]="node.expanded"
    #treeItem="ngTreeItem"
  >
    <span aria-hidden="true" class="material-symbols-outlined"
      >{{node.children ? 'chevron_right' : ''}}</span
    >
    <span aria-hidden="true" class="material-symbols-outlined"
      >{{node.children ? 'grocery' : 'nutrition'}}</span
    >
    {{ node.name }}
    <span aria-hidden="true" class="material-symbols-outlined">check</span>
  </li>

  @if (node.children) {
  <ul role="group">
    <ng-template ngTreeItemGroup [ownedBy]="treeItem" #group="ngTreeItemGroup">
      <ng-template
        [ngTemplateOutlet]="treeNodes"
        [ngTemplateOutletContext]="{nodes: node.children, parent: group}"
      />
    </ng-template>
  </ul>
  } }
</ng-template>
```

### tree-single-select-example.css

This file provides basic styling for the single-select tree.

```css
@import url('https://fonts.googleapis.com/icon?family=Material+Symbols+Outlined');

[ngTree] {
  padding: 10px;
  border: 1px solid black;
  border-radius: 4px;
  min-width: 24rem;
}

[ngTreeItem] {
  cursor: pointer;
  list-style: none;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.3rem 1rem;
}

[ngTreeItem]:hover,
[ngTreeItem]:focus {
  background-color: #e8f0fe;
}

[ngTreeItem]:focus {
  outline: 1px solid black;
}

[ngTreeItem][aria-selected='true'],
[ngTreeItem][aria-selected='true'] .expand-icon {
  color: darkblue;
}

[ngTreeItem] > .material-symbols-outlined {
  margin: 0;
  width: 24px;
}

[ngTreeItem] > .material-symbols-outlined:first-child {
  transition: transform 0.2s ease;
}

[ngTreeItem][aria-expanded='true'] > .material-symbols-outlined:first-child {
  transform: rotate(90deg);
}

[ngTreeItem] > .material-symbols-outlined:last-child {
  visibility: hidden;
  margin-left: auto;
}

[ngTreeItem][aria-current] > .material-symbols-outlined:last-child,
[ngTreeItem][aria-selected='true'] > .material-symbols-outlined:last-child {
  visibility: visible;
}

[ngTreeItem][aria-disabled='true'] {
  opacity: 0.5;
  cursor: not-allowed;
}
```

## Usage Notes

- When the `ngTree` directive is applied, it establishes the ARIA `tree` role. The `[(value)]` binding manages the currently selected item(s).
- Each node in the tree is marked with `ngTreeItem`. The `[value]` input provides a unique identifier for the item, and `[parent]` connects it to its parent `ngTree` or `ngTreeItemGroup`.
- The `value` input is required for `ngTreeItem`.
- Nested lists of children are wrapped in an `ng-template` with the `ngTreeItemGroup` directive. The `[ownedBy]` input links the group to its parent `ngTreeItem`.
