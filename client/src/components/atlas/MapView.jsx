import React, { useState, useEffect, useRef } from 'react';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import tippy from 'tippy.js'; // Import tippy
import { Menu, Item, useContextMenu } from 'react-contexify'; // Import context menu components
import 'react-contexify/ReactContexify.css'; // Import context menu CSS
import { Rnd } from 'react-rnd'; // Import Rnd
import * as FaIcons from 'react-icons/fa'; // Import Font Awesome icons
// tippy.css is already imported in main.jsx

const PIN_MENU_ID = "pin-context-menu";
const MAP_MENU_ID = "map-context-menu"; // New ID for map menu

// Define SVG paths for custom pin shapes
const PIN_SHAPES = {
  'pin': 'M10,0 C4.5,0 0,4.5 0,10 C0,15.5 10,30 10,30 C10,30 20,15.5 20,10 C20,4.5 15.5,0 10,0 Z',
  'circle': 'M10,0 C4.5,0 0,4.5 0,10 C0,15.5 4.5,20 10,20 C15.5,20 20,15.5 20,10 C20,4.5 15.5,0 10,0 Z',
  'square': 'M0,0 H20 V20 H0 Z',
  'arch': 'M0,20 H20 V10 C20,4.5 15.5,0 10,0 C4.5,0 0,4.5 0,10 Z',
  'shield': 'M10,0 L20,5 V12 C20,16.5 15.5,20 10,20 C4.5,20 0,16.5 0,12 V5 Z',
  'flag': 'M0,0 H20 V15 L15,12.5 L10,15 L5,12.5 L0,15 Z',
  'ribbon': 'M0,0 H20 V25 L10,20 L0,25 Z',
  'chevron': 'M0,0 H20 V15 L10,20 L0,15 Z'
};

// Accept all required props including onShowEditModal
const MapView = ({ 
  mapId, 
  onPinClick, 
  onDeletePin, 
  pinsLocked, 
  onUpdatePinPosition, 
  onShowLinkModal,
  onShowEditModal 
}) => {
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

  // Base pin size in pixels (adjusting for SVG viewbox)
  const pinWidth = 24; 
  const pinHeight = 30;

  // Construct the full image URL
  const fullImageUrl = `http://localhost:5001${mapData.imageUrl}`;

  // Function to get the appropriate icon component for a pin
  const getPinIcon = (pin) => {
    // Use pin's icon field as the actual icon name
    if (pin.icon) {
      return FaIcons[pin.icon] || FaIcons.FaHome;
    } 
    // Fallback to article's icon if available
    else if (pin.article?.icon) {
      return FaIcons[pin.article.icon] || FaIcons.FaHome;
    }
    // Default icon
    return FaIcons.FaHome;
  };

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
        // Now calls the edited modal handler
        if (pin) onShowEditModal({ pin }); 
        break;
      case "remove":
        if (pin) onDeletePin(pin._id);
        break;
      // Map Menu Actions
      case "add_pin":
        // Call new handler to open link modal for coordinates
        if (coords) onShowLinkModal({ coords });
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
    
    // Calculate percentage
    const xPercent = d.x / rect.width;
    const yPercent = d.y / rect.height;

    const clampedX = Math.max(0, Math.min(1, xPercent));
    const clampedY = Math.max(0, Math.min(1, yPercent));

    console.log(`Pin ${pinId} dragged to (Rnd): x=${clampedX}, y=${clampedY}`);
    onUpdatePinPosition(pinId, { x: clampedX, y: clampedY });
  };
  
  // Render a pin with customized styling using SVG
  const renderPin = (pin) => {
    const displayType = pin.displayType || 'pin+icon';
    const pinColor = pin.color || '#dc3545';
    const shapePath = PIN_SHAPES[pin.shape || 'pin'] || PIN_SHAPES.pin;
    const IconComponent = getPinIcon(pin);
    
    // Don't show the shape if icon-only mode
    if (displayType === 'icon-only') {
      return (
        <div className="map-pin icon-only-pin" style={{ 
          backgroundColor: pinColor,
          padding: '4px',
          borderRadius: '50%',
          border: '2px solid #fff',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          height: '100%'
        }}>
          <IconComponent color="#fff" size="80%" />
        </div>
      );
    }
    
    // For pin+icon or hide-icon modes, render the SVG shape
    return (
      <div className="map-pin-container" style={{ 
        position: 'relative', 
        width: '100%', 
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <svg width="100%" height="100%" viewBox="0 0 20 30" xmlns="http://www.w3.org/2000/svg" 
          style={{
            filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.5))',
          }}>
          <path d={shapePath} fill={pinColor} stroke="#fff" strokeWidth="1"/>
        </svg>
        
        {/* Only show icon if not in hide-icon mode */}
        {displayType !== 'hide-icon' && (
          <div style={{ 
            position: 'absolute',
            top: pin.shape === 'pin' ? '20%' : '25%', 
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#fff',
            zIndex: 2,
            backgroundColor: 'rgba(0,0,0,0.4)',
            borderRadius: '50%',
            padding: '2px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '12px',
            height: '12px',
          }}>
            <IconComponent size="90%" />
          </div>
        )}
      </div>
    );
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
              const initialX = pin.x * mapImageRef.current.offsetWidth;
              const initialY = pin.y * mapImageRef.current.offsetHeight;

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
                          delay: [300, 0], // Small delay to prevent flicker during interactions
                          placement: 'top',
                          arrow: true,
                        });
                      }
                    }}
                    data-pin-id={pin._id}
                    style={{
                      width: '100%', 
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
                  >
                    {renderPin(pin)}
                  </div>
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