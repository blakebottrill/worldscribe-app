import { ReactRenderer } from '@tiptap/react'
import tippy from 'tippy.js'

import CommandList from './CommandList' // Reuse the same list component

export default (articles) => ({ // Function that accepts articles
  items: ({ query }) => {
    console.log(`Mention items function called with query: "${query}"`); // Log query
    if (!articles) {
      console.log("Mention items: No articles available.");
      return []; 
    }
    const filtered = articles
      .filter(article => 
        article.title.toLowerCase().startsWith(query.toLowerCase())
      )
      .map(article => ({ title: article.title })) 
      .slice(0, 10); 
    console.log("Mention items returning:", filtered); // Log result
    return filtered;
  },

  render: () => {
    console.log("Mention render called"); // Simplified render
    // let component
    // let popup
    return {
      onStart: props => { console.log("Mention onStart"); },
      onUpdate(props) { console.log("Mention onUpdate"); },
      onKeyDown(props) { 
        console.log("Mention onKeyDown");
        // Return false so keys still work in editor
        return false; 
      },
      onExit() { console.log("Mention onExit"); },
    }
  },
}); 