import { Node, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export const ColumnLayoutNode = Node.create({
  name: 'columnLayoutNode',
  group: 'block',
  content: 'columnNode+', // Keep as 1+ for initial schema, plugin enforces count
  defining: true,
  draggable: true,

  // Add attribute to store the intended number of columns
  addAttributes() {
    return {
      columns: {
        default: 2, // Default to 2 columns
        // Simple parser, might need refinement based on how it's set
        parseHTML: element => parseInt(element.getAttribute('data-columns') || '2', 10),
        renderHTML: attributes => ({
          'data-columns': attributes.columns,
        }),
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'div[data-type="column-layout"]' }, // Parse based on data attribute
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    // Render with specific class and data attribute
    return [
      'div', 
      mergeAttributes(HTMLAttributes, { 
        'data-type': 'column-layout', 
        class: `column-layout columns-${node.attrs.columns}`, // Add specific class based on count
        'data-columns': node.attrs.columns // Ensure data-attribute is rendered
      }), 
      0 // Content goes here
    ];
  },

  // Add Normalization Plugin
  addProseMirrorPlugins() {
    const columnLayoutType = this.type; // Type of this node (ColumnLayoutNode)
    const columnType = this.editor.schema.nodes['columnNode']; // Type of the child (ColumnNode)
    const defaultContentType = this.editor.schema.nodes[columnType.contentMatch.defaultType?.name || 'paragraph']; // Default content for new columns

    return [
      new Plugin({
        key: new PluginKey('columnLayoutNormalization'),
        appendTransaction: (transactions, oldState, newState) => {
          const tr = newState.tr;
          let modified = false;

          // Only run check if document changed
          if (!transactions.some(t => t.docChanged)) {
            return null;
          }

          // Iterate through all columnLayout nodes in the new state
          newState.doc.descendants((node, pos) => {
            if (node.type !== columnLayoutType) {
              return true; // Continue descending if not the layout node
            }

            const intendedColumns = node.attrs.columns;
            const actualColumns = node.childCount;

            // Check 1: Ensure all children are columnNodes
            let childIndex = 0;
            node.forEach((child, offset, index) => {
              if (child.type !== columnType) {
                console.warn(`Invalid node type found in columnLayout at pos ${pos + 1 + offset}, replacing.`);
                // Replace invalid child with a valid, empty column
                const emptyColumn = columnType.createAndFill();
                if (emptyColumn) { // Ensure createAndFill succeeded
                  tr.replaceWith(pos + 1 + offset, pos + 1 + offset + child.nodeSize, emptyColumn);
                  modified = true;
                }
              }
              childIndex = index; // Keep track of last valid index
            });

            // Re-check actualColumns after potential replacements
            const currentActualColumns = node.childCount; // Get current count after loop

            // Check 2: Add missing columns
            if (currentActualColumns < intendedColumns) {
              for (let i = currentActualColumns; i < intendedColumns; i++) {
                console.log(`Adding missing column ${i + 1} of ${intendedColumns} to layout at pos ${pos}`);
                const emptyColumn = columnType.createAndFill(); // Create column with default content
                if (emptyColumn) { // Ensure createAndFill succeeded
                  // Calculate insert position: end of the node's content
                  const insertPos = pos + 1 + node.content.size; 
                  tr.insert(insertPos, emptyColumn);
                  modified = true;
                }
              }
            } 
            // Check 3: Remove extra columns
            else if (currentActualColumns > intendedColumns) {
              for (let i = currentActualColumns - 1; i >= intendedColumns; i--) {
                const extraColumn = node.child(i);
                const startPos = pos + 1 + node.content.findDiffStart(extraColumn.content); // Find start offset
                const from = startPos;
                const to = from + extraColumn.nodeSize;
                console.log(`Removing extra column ${i + 1} from layout at pos ${pos} [${from}-${to}]`);
                tr.delete(from, to);
                modified = true;
              }
            }

            return false; // Don't descend into children of the layout node here
          });

          return modified ? tr : null;
        },
      }),
    ];
  },
});

export default ColumnLayoutNode; 