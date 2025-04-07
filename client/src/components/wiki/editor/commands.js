import { ReactRenderer } from '@tiptap/react'
import tippy from 'tippy.js'

import CommandList from './CommandList'

// Based on Tiptap documentation example for suggestions
export default {
  items: ({ query }) => {
    // Basic commands for MVP
    return [
      {
        title: 'h1',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run()
        },
      },
      {
        title: 'h2',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run()
        },
      },
      {
        title: 'h3',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run()
        },
      },
      {
        title: 'bullet',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleBulletList().run()
        },
      },
      {
        title: 'number',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleOrderedList().run()
        },
      },
      {
        title: 'todo',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleTaskList().run()
        },
      },
      {
        title: 'quote',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleBlockquote().run()
        },
      },
      {
        title: 'divider',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setHorizontalRule().run()
        },
      },
      {
        title: 'image',
        command: ({ editor, range }) => {
          const url = window.prompt('Enter image URL:');
          if (url) {
            editor.chain().focus().deleteRange(range).setImage({ src: url }).run();
          }
        },
      },
      {
        title: 'link',
        command: ({ editor, range }) => {
          const previousUrl = editor.getAttributes('link').href;
          const url = window.prompt('Enter link URL:', previousUrl);
          // If user cancels or enters empty, unset the link
          if (url === null) return;
          if (url === '') {
            editor.chain().focus().deleteRange(range).extendMarkRange('link').unsetLink().run();
            return;
          }
          // Otherwise, set or update the link
          editor.chain().focus().deleteRange(range).extendMarkRange('link').setLink({ href: url }).run();
        },
      },
      {
        title: 'table',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        },
      },
      {
        title: 'code',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleCodeBlock().run()
        },
      },
      /* Deferred / Future Command Ideas:
         - Mention (@ linking, needs custom suggestion logic & data source)
         - Secret (requires custom node/mark and likely auth integration)
         - Auto-link (requires link detection logic)
         - Expand (requires custom node/component)
         - Layouts (requires complex custom nodes/components)
         - Element (purpose unclear, excluded for now)
         - Callout (requires custom node/component, excluded for now)
      */
    ].filter(item => item.title.toLowerCase().startsWith(query.toLowerCase()))
  },

  render: () => {
    // Restore pop-up logic
    let component
    let popup

    return {
      onStart: props => {
        // console.log("Slash command onStart"); 
        component = new ReactRenderer(CommandList, {
          props,
          editor: props.editor,
        })

        if (!props.clientRect) {
          return
        }

        popup = tippy('body', {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
        })
       },
      onUpdate(props) { 
        // console.log("Slash command onUpdate"); 
        component.updateProps(props)

        if (!props.clientRect) {
          return
        }

        popup[0].setProps({
          getReferenceClientRect: props.clientRect,
        })
      },
      onKeyDown(props) { 
        // console.log("Slash command onKeyDown"); 
        if (props.event.key === 'Escape') {
          popup[0].hide()
          return true
        }
        return component.ref?.onKeyDown(props) ?? false;
      },
      onExit() { 
        // console.log("Slash command onExit"); 
        if (popup && popup[0]) {
          popup[0].destroy()
        }
        if (component) {
          component.destroy()
        }
       },
    }
  },
} 