import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react'

const CommandList = forwardRef((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Log received items
  console.log("CommandList received items:", props.items);

  const selectItem = index => {
    const item = props.items[index];

    if (item) {
      // Check if it has a command (from slash commands) or just use title (from mentions)
      if (props.command && typeof props.command === 'function') {
        props.command(item); 
      } else {
        // Default behavior for mentions: insert the title
        // This requires the mention suggestion command handler to be set up correctly
        props.editor.chain().focus().insertContent(item.title).run();
      }
    }
  }

  const upHandler = () => {
    setSelectedIndex(((selectedIndex + props.items.length) - 1) % props.items.length)
  }

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length)
  }

  const enterHandler = () => {
    selectItem(selectedIndex)
  }

  useEffect(() => setSelectedIndex(0), [props.items])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') {
        upHandler()
        return true
      }

      if (event.key === 'ArrowDown') {
        downHandler()
        return true
      }

      if (event.key === 'Enter') {
        enterHandler()
        return true
      }

      return false
    },
  }))

  // Basic styling - can be improved later
  const listStyle = {
    padding: '0.2rem',
    position: 'relative',
    borderRadius: '0.5rem',
    background: '#FFF',
    color: 'rgba(0, 0, 0, 0.8)',
    overflow: 'hidden',
    fontSize: '0.9rem',
    boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.05), 0px 10px 20px rgba(0, 0, 0, 0.1)',
    maxHeight: '200px',
    overflowY: 'auto',
  };

  const itemStyle = {
    display: 'block',
    margin: '0',
    width: '100%',
    textAlign: 'left',
    background: 'transparent',
    borderRadius: '0.4rem',
    border: '1px solid transparent',
    padding: '0.2rem 0.4rem',
    color: '#333',
  };

  const selectedItemStyle = {
    ...itemStyle,
    borderColor: '#000',
    color: '#000',
  };

  return (
    <div style={listStyle}>
      {props.items.length ? (
        props.items.map((item, index) => (
          <button
            style={index === selectedIndex ? selectedItemStyle : itemStyle}
            key={index}
            onClick={() => selectItem(index)}
          >
            {item.title}
          </button>
        ))
      ) : (
        <div style={itemStyle}>No result</div>
      )}
    </div>
  )
});

CommandList.displayName = 'CommandList';

export default CommandList; 