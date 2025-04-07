import React, { forwardRef, useImperativeHandle, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state'; // Ensure PluginKey is imported
import Suggestion from '@tiptap/suggestion';
import commands from './editor/commands'; // Import our commands config
import MentionMark from './editor/mentionMark'; // Import the new MentionMark
import DetailsNode from './editor/nodes/detailsNode'; // Import Details
import SummaryNode from './editor/nodes/summaryNode'; // Import Summary
import DetailsContentNode from './editor/nodes/detailsContentNode'; // Import DetailsContent
import ColumnLayoutNode from './editor/nodes/columnLayoutNode'; // Import ColumnLayout
import ColumnNode from './editor/nodes/columnNode'; // Import Column
// import getMentionConfig from './editor/mentions'; // No longer needed for trigger

// Import additional extensions
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';

// Extension 1: Slash Commands
const SlashCommandsExtension = Extension.create({
  name: 'slashCommands',

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: '/',
        command: ({ editor, range, props }) => {
          props.command({ editor, range, props });
        },
        items: commands.items,
        render: commands.render,
        // Explicitly provide a unique key
        pluginKey: new PluginKey('slashSuggestion'), 
      }),
    ];
  },
});

// Extension 2: Mentions - Rewritten to use a custom plugin trigger
const MentionsExtension = Extension.create({
  name: 'mentionsTrigger', // Renamed for clarity

  addOptions() {
    return {
      // articles: [], // No longer needed in this extension itself
      onShowMentionLinkModal: () => { console.error('onShowMentionLinkModal not provided to MentionsExtension'); },
    };
  },

  addProseMirrorPlugins() {
    const extensionOptions = this.options;

    return [
      new Plugin({
        key: new PluginKey('mentionTriggerPlugin'), // Unique key for this plugin
        // Use appendTransaction to check changes *after* they happen
        appendTransaction: (transactions, oldState, newState) => {
          // Only interested in transactions that changed the document and were not reverted
          const docChanged = transactions.some(tr => tr.docChanged);
          if (!docChanged) {
            return null; // No change, no need to modify transaction
          }

          // Find the position where the change ended
          // We look at the mapping for the first transaction that changed the doc
          const change = transactions.find(tr => tr.docChanged);
          if (!change) return null;

          // Get the position right after the inserted text
          const endPos = change.mapping.map(oldState.selection.head);
          const $endPos = newState.doc.resolve(endPos);

          // Check the character immediately before the cursor
          const charBefore = newState.doc.textBetween(endPos - 1, endPos, "\ufffc", "\ufffc");

          if (charBefore === '@') {
            // Check context (optional but recommended: e.g., preceded by space?)
            const charBeforeTrigger = newState.doc.textBetween(endPos - 2, endPos - 1, "\ufffc", "\ufffc");
            const isStartOfNode = $endPos.parentOffset === 1;
            const precededBySpace = /\s/.test(charBeforeTrigger);

            if (isStartOfNode || precededBySpace) {
              console.log('Mention trigger detected!');
              // Call the modal handler. Pass the editor instance and the range of the '@' symbol.
              // We need the editor instance. Accessing via this.editor might work directly.
              if (this.editor?.view) { // Check if editor view is available
                  // Schedule the modal call to run after the transaction is dispatched
                  setTimeout(() => {
                    extensionOptions.onShowMentionLinkModal(this.editor, { from: endPos - 1, to: endPos });
                  }, 0);
              } else {
                  console.warn('Editor instance not available in mention trigger plugin yet.')
              }
            }
          }
          return null; // Don't modify the transaction itself
        },
      })
    ];
  },
});

const MarkdownEditor = forwardRef(({ content, onChange, articles, onShowMentionLinkModal, placeholder = 'Start writing...' }, ref) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({ placeholder }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Image,
      Link.configure({ openOnClick: false, autolink: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      SlashCommandsExtension, 
      MentionsExtension.configure({
        onShowMentionLinkModal: onShowMentionLinkModal,
      }),
      MentionMark,
      DetailsNode,      
      SummaryNode,      
      DetailsContentNode,
      ColumnLayoutNode,
      ColumnNode,
    ],
    // Initialize empty, content will be set via useEffect
    content: '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none p-2 border border-gray-300 rounded min-h-[200px]',
      },
    },
  });

  // Effect to explicitly set content when the prop changes or editor initializes
  useEffect(() => {
    if (!editor || !content) {
      return; // Don't run if editor isn't ready or content is null/empty
    }

    // Avoid resetting content if it already matches (prevents cursor jumps)
    // Compare editor.isEmpty specifically for initially empty state might be needed
    // Or compare HTML strings carefully.
    if (content !== editor.getHTML()) {
        // Use JSON if possible for more reliable comparison/setting?
        // For now, sticking with HTML.
        console.log("Setting editor content from prop...");
        // Set content without triggering the onUpdate callback
        editor.commands.setContent(content, false); 
    }
  }, [content, editor]); // Re-run when content prop or editor instance changes

  useImperativeHandle(ref, () => editor, [editor]);

  return (
    <EditorContent editor={editor} />
  );
});

export default MarkdownEditor; 