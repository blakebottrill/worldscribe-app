import { ReactRenderer } from '@tiptap/react'
import tippy from 'tippy.js'

import CommandList from './CommandList'

// Based on Tiptap documentation example for suggestions
export default {
  items: ({ query }) => {
    const allCommands = [
      {
        title: 'Heading 1',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run()
        },
      },
      {
        title: 'Heading 2',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run()
        },
      },
      {
        title: 'Heading 3',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run()
        },
      },
      {
        title: 'Paragraph',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setNode('paragraph').run()
        },
      },
      {
        title: 'Bold',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setMark('bold').run()
        },
      },
      {
        title: 'Bullet',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleBulletList().run()
        },
      },
      {
        title: 'Number',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleOrderedList().run()
        },
      },
      {
        title: 'Todo',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleTaskList().run()
        },
      },
      {
        title: 'Quote',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleBlockquote().run()
        },
      },
      {
        title: 'Divider',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setHorizontalRule().run()
        },
      },
      {
        title: 'Image',
        command: ({ editor, range }) => {
          const url = window.prompt('Enter image URL:');
          if (url) {
            editor.chain().focus().deleteRange(range).setImage({ src: url }).run();
          }
        },
      },
      {
        title: 'Link',
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
        title: 'Table',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        },
      },
      {
        title: 'Code',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleCodeBlock().run()
        },
      },
      {
        title: 'AI Continue',
        command: async ({ editor, range }) => {
          const context = editor.getText().substring(0, range.from - 1);
          editor.chain().focus().deleteRange(range).insertContent('[🧠 Generating...]').run();

          try {
            const response = await fetch('http://localhost:5001/api/ai/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ context, action: 'continue' })
            });
            if (!response.ok) throw new Error('AI generation failed');
            const { generatedText } = await response.json();
            // Replace placeholder with generated text
            editor.chain().focus().deleteRange({ from: range.from, to: range.from + 18 }).insertContent(generatedText).run();
          } catch (error) {
            console.error("AI Continue Error:", error);
            editor.chain().focus().deleteRange({ from: range.from, to: range.from + 18 }).insertContent('[❌ AI Error]').run();
          }
        },
        renderId: 'ai-continue'
      },
      {
        title: 'AI Expand', // User selects this, then is prompted for topic
        command: async ({ editor, range }) => {
          // Prompt for the topic after selecting the command
          const topic = window.prompt("Enter the topic to expand on:");

          if (!topic || topic.trim() === '') { // Handle cancel or empty input
            editor.chain().focus().deleteRange(range).run(); // Just delete the command trigger
            alert("AI Expand cancelled or topic missing.");
            return;
          }

          const context = editor.getText().substring(0, range.from -1); // Text before command trigger
          const placeholder = `[🧠 Expanding on ${topic}...]`;
          editor.chain().focus().deleteRange(range).insertContent(placeholder).run();
          const placeholderLength = placeholder.length;
          
          try {
            const response = await fetch('http://localhost:5001/api/ai/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ context, action: 'expand', topic: topic.trim() })
            });
             if (!response.ok) throw new Error('AI generation failed');
            const { generatedText } = await response.json();
            editor.chain().focus().deleteRange({ from: range.from, to: range.from + placeholderLength }).insertContent(generatedText).run();
          } catch (error) {
             console.error("AI Expand Error:", error);
             editor.chain().focus().deleteRange({ from: range.from, to: range.from + placeholderLength }).insertContent('[❌ AI Error]').run();
          }
        },
        renderId: 'ai-expand'
      },
    ];

    // Filter commands based on query
    if (!query) {
       // Show all non-AI commands by default? Or maybe just core ones?
       return allCommands.filter(c => !c.renderId?.startsWith('ai-'));
    }

    // Special handling for /ai-expand to keep it visible while typing topic
    if (query.startsWith('ai-expand')) {
        return allCommands.filter(item => item.renderId === 'ai-expand');
    }

    return allCommands.filter(item => 
        item.title.toLowerCase().startsWith(query.toLowerCase())
    ).slice(0, 10);
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