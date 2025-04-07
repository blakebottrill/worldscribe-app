import { Mark, mergeAttributes } from '@tiptap/core';

export const MentionMark = Mark.create({
  name: 'mentionMark',

  // Make it span across words like a link
  inclusive: false, 

  // Define attributes to store data
  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: element => element.getAttribute('data-mention-id'),
        renderHTML: attributes => ({
          'data-mention-id': attributes.id,
        }),
      },
      label: {
        default: null,
        parseHTML: element => element.getAttribute('data-mention-label') || element.innerText,
        renderHTML: attributes => ({
          'data-mention-label': attributes.label,
        }),
      },
    };
  },

  // How to parse this mark from HTML input
  parseHTML() {
    return [
      {
        // Match span tags with the data-mention-id attribute
        tag: 'span[data-mention-id]',
      },
      // Optional: Could also add parsing for <a> tags if needed
      // {
      //   tag: 'a[data-mention-id]',
      // },
    ];
  },

  // How to render this mark to HTML output
  renderHTML({ HTMLAttributes }) {
    // Render as a span, merging existing attributes with our data attributes
    // We use the label as the visible text content within the span
    // Note: Tiptap handles placing the content (label) inside the tag.
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]; 
    // The '0' indicates where the content (the label text) should go.
  },

  // Optional: Input rules (if needed for typing mentions directly)
  // addInputRules() { ... }

  // Optional: Paste rules (if needed for pasting text with mentions)
  // addPasteRules() { ... }
});

export default MentionMark; 