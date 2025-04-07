import { Node, mergeAttributes } from '@tiptap/core';

export const ColumnNode = Node.create({
  name: 'columnNode',
  group: 'block', // Technically contains block content
  content: 'block+', // Allow one or more block elements (paragraphs, etc.)
  defining: true,
  draggable: false, // Usually drag the parent layout, not individual columns
  splittable: false, // Prevent this node from being split by Enter etc.

  parseHTML() {
    return [
      { tag: 'div[data-type="column"]' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div', 
      mergeAttributes(HTMLAttributes, { 'data-type': 'column', class: 'column' }), 
      0
    ];
  },
});

export default ColumnNode; 