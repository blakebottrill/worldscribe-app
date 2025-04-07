import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import tippy from 'tippy.js'; // Import tippy
import { Menu, Item, useContextMenu } from 'react-contexify'; // Import context menu components
import 'react-contexify/ReactContexify.css'; // Import context menu CSS
import { Rnd } from 'react-rnd'; // Import Rnd
// tippy.css is already imported in main.jsx

const PIN_MENU_ID = "pin-context-menu";
const MAP_MENU_ID = "map-context-menu"; // New ID for map menu

// Accept pinsLocked and onUpdatePinPosition props
const MapView = ({ mapId, onPinClick, onDeletePin, pinsLocked, onUpdatePinPosition, onShowLinkModal }) => {
  const [mapData, setMapData] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false); // State to track image load
  const mapImageRef = useRef(null);

  // Use hook for both menus
  const { show } = useContextMenu();

  useEffect(() => {
    if (!mapId) return;

    const fetchMapData = async () => {
      try {
        const response = await fetch(`http://localhost:5001/api/maps/${mapId}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("MapView received mapData:", data);
        console.log("MapView setting image URL:", data.imageUrl);
        setMapData(data);
      } catch (e) {
        console.error("Failed to fetch map data:", e);
      }
    };

    fetchMapData();
  }, [mapId]); // Refetch when mapId changes

  if (!mapData) return <p>Select a map to view.</p>; // Handle initial load / no data

  const containerStyle = {
    width: '100%', 
    // Limited height for example, adjust as needed for layout
    height: 'calc(100vh - 250px)', 
    border: '1px solid #ccc',
    overflow: 'hidden', // Handled by TransformWrapper
    position: 'relative' // Needed for absolute positioning of pins
  };

  const pinStyle = {
    position: 'absolute',
    width: '10px',
    height: '10px',
    backgroundColor: 'red',
    borderRadius: '50%',
    cursor: 'pointer',
    transform: 'translate(-50%, -50%)', // Center the pin on coordinates
    border: '1px solid white'
  };

  const pinContainerStyle = {
    position: 'absolute',
    transform: 'translate(-50%, -50%)', // Center the container
    zIndex: 5, // Keep pins above image but potentially below temp pin
  };

  // Need pin dimensions for Rnd size
  const pinWidth = 10; // Must match pinStyle.width
  const pinHeight = 10; // Must match pinStyle.height

  // Construct the full image URL
  const fullImageUrl = `http://localhost:5001${mapData.imageUrl}`;

  // Updated context menu handler
  function handleContextMenu(event) {
    event.preventDefault();
    // Check if the target is a pin container or the map itself
    const pinElement = event.target.closest('[data-pin-id]'); // Add data-pin-id attribute to pin div

    if (pinElement) {
      const pinId = pinElement.getAttribute('data-pin-id');
      const pin = mapData.pins.find(p => p._id === pinId);
      if (pin) {
        show({ event, id: PIN_MENU_ID, props: { pin } });
      }
    } else if (mapImageRef.current?.contains(event.target)) { // Clicked on map area
       const rect = mapImageRef.current.getBoundingClientRect();
       // Calculate click position relative to the image, as percentages
       const x = (event.clientX - rect.left) / rect.width;
       const y = (event.clientY - rect.top) / rect.height;
       const clampedX = Math.max(0, Math.min(1, x));
       const clampedY = Math.max(0, Math.min(1, y));
       
       show({ event, id: MAP_MENU_ID, props: { coords: { x: clampedX, y: clampedY } } });
    }
  }

  // Updated menu item click handler
  const handleItemClick = ({ id, props, event }) => { 
    const pin = props?.pin;
    const coords = props?.coords;

    switch (id) {
      // Pin Menu Actions
      case "goto":
        if (pin) onPinClick(pin.article?._id);
        break;
      case "edit":
        // Call new handler to open link modal
        if (pin) onShowLinkModal({ pin }); 
        // alert(`Edit functionality for pin ${pin._id} not yet implemented.`);
        break;
      case "remove":
        if (pin) onDeletePin(pin._id);
        break;
      // Map Menu Actions
      case "add_pin":
        // Call new handler to open link modal
        if (coords) onShowLinkModal({ coords });
        /* 
        console.log("Context menu: Add pin at", coords);
        const articleTitle = window.prompt("Enter the EXACT title of the article to link:");
        if (articleTitle && articleTitle.trim() !== "") {
          onPlacePin({ ...coords, articleTitle: articleTitle.trim() });
        } else {
          alert("Pin cancelled.");
        }
        */
        break;
      default:
        console.log("Unknown menu item clicked");
    }
  };

  // Updated handler for when dragging stops with Rnd
  const handleDragStop = (e, d, pinId) => {
    // d.x and d.y are the final pixel coordinates relative to the offset parent (the map container)
    if (!mapImageRef.current) return;

    const rect = mapImageRef.current.getBoundingClientRect();
    // Calculate percentage, accounting for pin being centered on cursor
    const xPercent = (d.x + pinWidth / 2) / rect.width;
    const yPercent = (d.y + pinHeight / 2) / rect.height;

    const clampedX = Math.max(0, Math.min(1, xPercent));
    const clampedY = Math.max(0, Math.min(1, yPercent));

    console.log(`Pin ${pinId} dragged to (Rnd): x=${clampedX}, y=${clampedY}`);
    onUpdatePinPosition(pinId, { x: clampedX, y: clampedY });
  };

  return (
    <div style={containerStyle}>
      <TransformWrapper>
        <TransformComponent>
          <div 
            ref={mapImageRef}
            style={{ position: 'relative', lineHeight: 0, cursor: pinsLocked ? 'grab' : 'default' }}
            onContextMenu={handleContextMenu}
          >
            <img 
              src={fullImageUrl} 
              alt={mapData.title} 
              style={{ maxWidth: '100%', display: 'block' }} 
              onLoad={() => setImageLoaded(true)} // Trigger re-render when image loads
            />
            
            {/* Only render pins if image is loaded and dimensions are likely available */}
            {imageLoaded && mapData.pins && mapData.pins.map((pin, index) => {
              // Rnd needs position and size in pixels.
              const initialX = (mapImageRef.current ? pin.x * mapImageRef.current.offsetWidth - pinWidth / 2 : 0);
              const initialY = (mapImageRef.current ? pin.y * mapImageRef.current.offsetHeight - pinHeight / 2 : 0);

              return (
                <Rnd
                  key={pin._id || index}
                  size={{ width: pinWidth, height: pinHeight }}
                  position={{ x: initialX, y: initialY }}
                  onDragStart={(e) => e.stopPropagation()} // Stop propagation on drag start
                  onDragStop={(e, d) => handleDragStop(e, d, pin._id)}
                  disableDragging={pinsLocked}
                  enableResizing={false}
                  bounds="parent"
                  style={{ zIndex: 5 }}
                >
                  {/* The visible pin element, handles interactions */}
                  <div 
                    ref={node => {
                      if (node) {
                        // Destroy existing instance if node re-renders/changes
                        if (node._tippy) {
                          node._tippy.destroy();
                        }
                        // Create new instance
                        const title = pin.article?.title || 'Linked Article';
                        tippy(node, {
                          content: title,
                          delay: [0, 0],
                          placement: 'top',
                          arrow: true,
                        });
                        // Log the element being assigned to the ref
                        console.log(`Pin Render ${index}: Ref/Tippy assigned to`, node);
                      } else {
                        // Optional: Handle cleanup if element is removed? 
                        // Tippy should handle this if node._tippy exists and node is removed
                      }
                    }}
                    data-pin-id={pin._id}
                    style={{ 
                       ...pinStyle,
                       // Override position/transform from pinStyle as Rnd handles it
                       position: 'static', 
                       transform: 'none', 
                       width: '100%', // Fill the Rnd wrapper
                       height: '100%',
                       cursor: pinsLocked ? 'pointer' : 'move',
                    }}
                    onClick={(e) => { 
                      if (pinsLocked) {
                        e.stopPropagation(); 
                        onPinClick(pin.article?._id); 
                      }
                    }}
                    onContextMenu={(e) => {
                      e.stopPropagation(); 
                      handleContextMenu(e); 
                    }}
                  />
                </Rnd>
              );
            })}
          </div>
        </TransformComponent>
      </TransformWrapper>

      {/* Pin Context Menu */}
      <Menu id={PIN_MENU_ID}>
        <Item id="goto" onClick={handleItemClick}>Go to element</Item>
        <Item id="edit" onClick={handleItemClick}>Edit pin</Item>
        <Item id="remove" onClick={handleItemClick}>Remove pin</Item>
      </Menu>

      {/* Map Context Menu */}
      <Menu id={MAP_MENU_ID}>
        <Item id="add_pin" onClick={handleItemClick}>Add pin here</Item>
      </Menu>

    </div>
  );
};

export default MapView; 