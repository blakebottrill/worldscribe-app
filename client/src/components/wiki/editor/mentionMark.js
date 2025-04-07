import { Mark, mergeAttributes, getMarkRange } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

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

  // Add plugin to validate mentions on transaction
  addProseMirrorPlugins() {
    const markType = this.editor.schema.marks[this.name]; // Get the MarkType instance

    return [
      new Plugin({
        key: new PluginKey('mentionMarkValidation'),
        appendTransaction: (transactions, oldState, newState) => {
          const docChanged = transactions.some(tr => tr.docChanged);
          if (!docChanged) {
            return null;
          }

          let tr = newState.tr;
          let modified = false;

          // Use a Set to track validated mark instances (range + label)
          const validatedMarks = new Set();

          // Iterate through the *entire* new document state
          newState.doc.nodesBetween(0, newState.doc.content.size, (node, pos) => {
            if (!node.isText || !node.marks || node.marks.length === 0) {
              return; // Only interested in text nodes with marks
            }

            // Find mention marks on this node
            const mentionMarks = node.marks.filter(mark => mark.type === markType);

            mentionMarks.forEach(mark => {
              // Find the range of this specific mark instance
              const $pos = newState.doc.resolve(pos); // Use node's starting position
              const markRange = getMarkRange($pos, markType, mark.attrs);

              if (markRange) {
                const { from, to } = markRange;
                const originalLabel = mark.attrs.label;
                const uniqueKey = `${from}-${to}-${originalLabel}`;

                // Skip if we've already validated this exact mark instance in this transaction cycle
                if (validatedMarks.has(uniqueKey)) {
                  return;
                }

                // Ensure range is valid before getting text
                const checkFrom = Math.max(0, from);
                const checkTo = Math.min(newState.doc.content.size, to);
                if (checkFrom >= checkTo) { // Check for empty or invalid range
                   validatedMarks.add(uniqueKey); // Mark as processed even if range was bad
                   return; 
                }

                const currentText = newState.doc.textBetween(checkFrom, checkTo, "\ufffc");
                
                // Compare current text with the stored label
                if (currentText !== originalLabel) {
                  console.log(`Mention text validation failed [${checkFrom},${checkTo}]: '${currentText}' !== '${originalLabel}'. Removing mark.`);
                  tr = tr.removeMark(checkFrom, checkTo, markType);
                  modified = true;
                   // Don't add to validatedMarks, as it's removed now
                } else {
                   // Mark as validated if text matches
                   validatedMarks.add(uniqueKey);
                }
              }
            });
          });

          if (modified) {
            return tr;
          }

          return null;
        },
      }),
    ];
  },
});

export default MentionMark; 