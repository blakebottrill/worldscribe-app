import { Node, mergeAttributes } from '@tiptap/core';

// This node will represent the content area *within* the <details> tag,
// but *not* including the <summary>. It needs a distinct representation
// in the schema even though it doesn't render its own tag.
export const DetailsContentNode = Node.create({
  name: 'detailsContentNode',
  group: 'block', // Contains block content
  content: 'block+', // Requires one or more block nodes inside
  defining: true,

  // Important: This node itself doesn't render a tag directly,
  // it's just a container within the <details> structure for schema rules.
  // Tiptap handles placing its content correctly within the parent node's renderHTML.
  parseHTML() {
    // Content directly inside <details> that ISN'T <summary> should go here.
    // This might need refinement based on actual HTML structure, but this
    // attempts to capture content *after* a summary inside details.
    return [{
      tag: 'details > :not(summary)', // Selects direct children not being summary
      // contentElement: 'div' // Might need a wrapper? Let's try without first.
    }];
  },

  // Add renderHTML to provide a container for the content
  renderHTML({ HTMLAttributes }) {
    // Render a non-semantic div to hold the block content within the details.
    // Tiptap will place the actual content (paragraphs, lists, etc.) inside this div.
    return ['div', mergeAttributes(HTMLAttributes), 0]; 
  },
});

export default DetailsContentNode; 