import React from 'react';

// Simple component to list map titles
const MapList = ({ maps, onSelect, selectedMapId }) => {
  const listStyles = {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    width: '200px', // Fixed width
    borderRight: '1px solid #ccc',
    maxHeight: 'calc(100vh - 250px)', // Example height
    overflowY: 'auto'
  };

  const itemStyles = {
    padding: '10px',
    cursor: 'pointer',
    borderBottom: '1px solid #eee',
  };

  const selectedItemStyles = {
    ...itemStyles,
    backgroundColor: '#e0e0e0',
    fontWeight: 'bold',
  };

  return (
    <ul style={listStyles}>
      {maps.map(map => (
        <li 
          key={map._id} 
          style={map._id === selectedMapId ? selectedItemStyles : itemStyles}
          onClick={() => onSelect(map)}
        >
          {map.title}
        </li>
      ))}
    </ul>
  );
};

export default MapList; 