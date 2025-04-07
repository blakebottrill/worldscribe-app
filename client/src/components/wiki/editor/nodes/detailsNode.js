import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import DetailsNodeView from './DetailsNodeView'; // We will create this component next

export const DetailsNode = Node.create({
  name: 'detailsNode',
  group: 'block',
  content: 'summaryNode detailsContentNode', // Requires a summary and content
  defining: true, // Treat as a single unit
  draggable: true, // Make it draggable

  // Add 'open' attribute
  addAttributes() {
    return {
      open: {
        default: false, // Default to closed
        // Render as an HTML attribute
        renderHTML: attributes => ({
          open: attributes.open ? '' : undefined, // Add 'open' attribute if true
        }),
        // Parse from HTML attribute
        parseHTML: element => element.hasAttribute('open'),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'details' }];
  },

  // RenderHTML is less important now as the Node View will handle rendering
  renderHTML({ HTMLAttributes }) {
    // Provide basic tag structure for compatibility/export
    return ['details', mergeAttributes(HTMLAttributes), 0]; // 0 puts content inside
  },

  // Define the Node View
  addNodeView() {
    return ReactNodeViewRenderer(DetailsNodeView);
  },

  // Add keyboard shortcut for exiting
  addKeyboardShortcuts() {
    return {
      'Enter': ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { $head, $anchor } = selection;

        // Log current state when Enter is pressed near the end
        const parent = $head.parent;
        const grandParent = $head.node(-1);
        const greatGrandParent = $head.node(-2);
        console.log(
          'Enter Shortcut Check:',
          `Pos: ${$head.pos}`, 
          `End of Parent: ${$head.end()}`,
          `Parent Type: ${parent.type.name}`,
          `Parent ChildCount: ${parent.childCount}`,
          `Index in Parent: ${$head.index()}`,
          `IndexAfter Parent: ${$head.indexAfter()}`,
          `Grandparent Type: ${grandParent?.type.name}`,
          `GreatGrandparent Type: ${greatGrandParent?.type.name}`,
          `IndexAfter Grandparent: ${$head.indexAfter(-1)}`
        );

        // Existing condition check
        if (parent.type.name === 'paragraph' &&
            $head.pos === $head.end() && 
            grandParent?.type.name === 'detailsContentNode' &&
            $head.indexAfter(-1) === parent.childCount // Corrected: check index within grandparent
           ) {
             // Check if detailsContentNode is the last child of detailsNode
             const detailsNodePos = $head.before(-2);
             const detailsNode = greatGrandParent; // Already have this reference
             
             if (detailsNode && detailsNode.type.name === 'detailsNode' && detailsNode.lastChild === grandParent){
                 console.log("Condition MET. Attempting to exit details node...");
                 // *** Try explicit insert after ***
                 return editor.chain().focus().insertContentAt($head.after(-2), { type: 'paragraph' }).run();
                 // return editor.commands.exitCode(); // Original attempt
             }
        }
        console.log("Enter condition NOT MET or default behaviour.");
        return false; // Let default Enter behavior apply otherwise
      },
      // Optional: Could add Shift+Enter for soft breaks if needed
      // Optional: Could add Backspace handling at the start if needed
    };
  },
});

export default DetailsNode; 