import { Node, mergeAttributes } from '@tiptap/core';

export const SummaryNode = Node.create({
  name: 'summaryNode',
  group: 'block', // Should it be block or inline content holder? Let's try block for now.
  content: 'inline*', // Allows inline content like text, marks
  defining: true, // Part of the details structure
  selectable: false, // Usually don't select the summary tag itself

  parseHTML() {
    return [{ tag: 'summary' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['summary', mergeAttributes(HTMLAttributes), 0];
  },
});

export default SummaryNode; 