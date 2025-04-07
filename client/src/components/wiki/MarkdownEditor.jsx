import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import commands from './editor/commands'; // Import our commands config
import getMentionConfig from './editor/mentions'; // Import the mention config function

// Import additional extensions
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';

// Restore unified SuggestionsExtension
const SuggestionsExtension = Extension.create({
  name: 'suggestions',

  addOptions() {
    return {
      articles: [],
    };
  },

  addProseMirrorPlugins() {
    const articles = this.options.articles;
    const mentionConfig = getMentionConfig(articles);

    return [
      // Slash command suggestion
      Suggestion({
        editor: this.editor, // Pass editor instance
        char: '/', 
        command: ({ editor, range, props }) => {
          props.command({ editor, range, props });
        },
        items: commands.items, 
        render: commands.render, 
      }),
      // Mention suggestion (Disabled due to plugin key conflict)
      /* Suggestion({
        editor: this.editor, // Pass editor instance
        char: '@',
        allow: ({ editor, range }) => true, 
        command: ({ editor, range, props }) => {
          editor.chain().focus().deleteRange(range).insertContent(props.title).run();
        },
        items: mentionConfig.items,
        render: mentionConfig.render,
      }), */
    ]
  },
})

// Accept articles prop
const TiptapEditor = ({ content, onChange, articles, placeholder = 'Start writing...' }) => {

  // Log received articles
  // console.log("TiptapEditor received articles:", articles);

  // Create mention config using passed articles (No longer needed here)
  // const mentionConfig = getMentionConfig(articles);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // StarterKit includes Blockquote, HorizontalRule
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: placeholder,
      }),
      // Add new extensions
      TaskList,
      TaskItem.configure({
        nested: true, // Allow nested tasks
      }),
      Image, // Basic image support (resizing might need more config)
      Link.configure({
        openOnClick: false, // Prevent clicking links in editor
        autolink: true, // Autolink URLs
      }),
      Table.configure({
        resizable: true, // Allow column resizing
      }),
      TableRow,
      TableHeader,
      TableCell,
      
      // Add and configure the unified SuggestionsExtension
      SuggestionsExtension.configure({ 
        articles: articles, 
      }),
    ],
    content: content, // Initial content (HTML)
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML()); // Pass HTML content back up
    },
    editorProps: {
      attributes: {
        // Remove prose classes, keep basic layout/border styles
        class: 'focus:outline-none p-2 border border-gray-300 rounded min-h-[200px]',
      },
    },
  });

  // Optional: Add a simple toolbar later

  return (
    <EditorContent editor={editor} />
  );
};

export default TiptapEditor; 