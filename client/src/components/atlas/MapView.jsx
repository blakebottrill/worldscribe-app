import React, { useState, useRef } from 'react';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import tippy from 'tippy.js'; // Import tippy
import { Menu, Item, useContextMenu } from 'react-contexify'; // Import context menu components
import 'react-contexify/ReactContexify.css'; // Import context menu CSS
import { Rnd } from 'react-rnd'; // Import Rnd
import * as FaIcons from 'react-icons/fa'; // Import Font Awesome icons
import { useQuery } from '@tanstack/react-query'; // Import useQuery
import { FaSpinner } from 'react-icons/fa'; // Import spinner
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

// API function to fetch a specific map
const fetchMapDataById = async (mapId) => {
  if (!mapId) return null;
  const response = await fetch(`http://localhost:5001/api/maps/${mapId}`);
  if (!response.ok) {
    throw new Error(`HTTP error fetching map ${mapId}! status: ${response.status}`);
  }
  return response.json();
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
  // const [mapData, setMapData] = useState(null); // Replaced by useQuery
  const [imageLoaded, setImageLoaded] = useState(false); // State to track image load
  const [transformState, setTransformState] = useState({ scale: 1 }); // Track zoom level
  const mapImageRef = useRef(null);
  const mapContainerRef = useRef(null);
  // Add refs to manage drag state
  const dragStartPos = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragThreshold = 5; // Pixels threshold to initiate drag

  // Use hook for both menus
  const { show } = useContextMenu();

  // Fetch map data using React Query
  const { data: mapData, isLoading, error } = useQuery({
    queryKey: ['map', mapId], // Query key includes mapId
    queryFn: () => fetchMapDataById(mapId), // Call the API function
    enabled: !!mapId, // Only run the query if mapId is truthy
    staleTime: 5 * 60 * 1000, // Optional: Keep data fresh for 5 minutes
    // Add placeholderData or initialData if needed for smoother loading
  });

  // Handle loading and error states
  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <FaSpinner className="spinner" size={32} /> {/* Use Spinner */}
        <span style={{ marginLeft: '15px' }}>Loading map data...</span>
      </div>
    );
  }
  if (error) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <p>Error loading map:</p>
        <p>{error.message}</p>
      </div>
    );
  }
  // If mapId is null/undefined and query is disabled, show default message
  if (!mapData) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <p>Select a map to view.</p>
      </div>
    );
  } 

  // Updated container style for full height and background pattern
  const containerStyle = {
    width: '100%',
    height: '100%',
    border: '1px solid #ccc',
    overflow: 'hidden',
    position: 'relative',
    // Graph paper background
    backgroundColor: '#fdfdfd', // White background
    backgroundImage: 'linear-gradient(to right, #eee 1px, transparent 1px), linear-gradient(to bottom, #eee 1px, transparent 1px)',
    backgroundSize: '20px 20px', // Size of the grid squares
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
      // Direct use of mouseCoordinates instead of context menu
      const rect = mapImageRef.current.getBoundingClientRect();
      const { scale } = transformState;
      
      // Calculate position relative to the image, accounting for zoom
      const mouseX = (event.clientX - rect.left) / scale;
      const mouseY = (event.clientY - rect.top) / scale;
      
      // Convert to percentage
      const xPercent = mouseX / (rect.width / scale);
      const yPercent = mouseY / (rect.height / scale);
      
      // Ensure coordinates are within bounds
      const clampedX = Math.max(0, Math.min(1, xPercent));
      const clampedY = Math.max(0, Math.min(1, yPercent));
      
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
      // Map Context Menu Actions
      case "add_pin":
        // Call link modal with the pre-calculated coordinates
        if (coords) onShowLinkModal({ coords });
        break;
      default:
        console.log("Unknown menu item clicked");
    }
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
    <div style={containerStyle} ref={mapContainerRef}>
      <TransformWrapper 
        onTransformed={(ref) => setTransformState(ref.state)}
        limitToBounds={false}
        // Disable panning when dragging a pin
        panning={{ disabled: isDraggingRef.current }}
        // Disable zooming when dragging a pin (optional but good practice)
        // wheel={{ disabled: isDraggingRef.current }}
      >
        <TransformComponent 
          wrapperStyle={{ width: '100%', height: '100%' }}
          contentStyle={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
        >
          <div 
            ref={mapImageRef}
            style={{ 
              position: 'relative', 
              lineHeight: 0, 
              cursor: pinsLocked ? 'grab' : 'default',
              width: '100%',
              height: 'auto',
              display: 'flex',
              justifyContent: 'center'
            }}
            onContextMenu={handleContextMenu}
          >
            <img 
              src={fullImageUrl} 
              alt={mapData.title} 
              style={{ 
                width: '100%', 
                height: 'auto', 
                objectFit: 'contain', 
                display: 'block'
              }} 
              onLoad={() => setImageLoaded(true)} // Trigger re-render when image loads
            />
            
            {/* Only render pins if image is loaded and dimensions are likely available */}
            {imageLoaded && mapData.pins && mapData.pins.map((pin, index) => {
              // Calculate initial position based on stored percentages
              const initialLeft = pin.x * 100;
              const initialTop = pin.y * 100;

              return (
                <div
                  key={pin._id || index}
                  className="pin-wrapper"
                  style={{
                    position: 'absolute',
                    left: `${initialLeft}%`,
                    top: `${initialTop}%`,
                    width: `${pinWidth}px`,
                    height: `${pinHeight}px`,
                    transform: 'translate(-50%, -100%)', // Center horizontally, align bottom with position
                    cursor: pinsLocked ? 'pointer' : 'grab', // Use grab cursor for unlocked pins
                    zIndex: 5,
                  }}
                  data-pin-id={pin._id}
                  ref={node => {
                    // Tooltip setup - Attach tippy instance to the node
                    if (node) {
                      if (!node._tippy) { // Create only if it doesn't exist
                        const title = pin.article?.title || 'Linked Article';
                        tippy(node, {
                          content: title,
                          delay: [300, 0],
                          placement: 'top',
                          arrow: true,
                          // Hide on mousedown to prevent issues during drag/click
                          hideOnClick: false, // We'll manage hide manually
                          trigger: 'mouseenter focus', // Standard triggers
                        });
                      } else {
                        // Update content if needed (e.g., article title changes)
                        node._tippy.setContent(pin.article?.title || 'Linked Article');
                      }
                    }
                  }}
                  onMouseDown={(e) => {
                    // --- Start of onMouseDown ---
                    if (pinsLocked) return; // Ignore if pins are locked
                    if (e.button !== 0) return; // Only allow left clicks for dragging

                    // Hide tooltip immediately on mousedown for unlocked pins
                    const tippyInstance = e.currentTarget._tippy;
                    if (tippyInstance) tippyInstance.hide();

                    e.stopPropagation(); // Prevent map panning
                    const target = e.currentTarget;
                    target.style.cursor = 'grabbing'; // Change cursor to indicate dragging

                    dragStartPos.current = { x: e.clientX, y: e.clientY };
                    isDraggingRef.current = false; // Reset drag flag initially

                    const imageRect = mapImageRef.current.getBoundingClientRect();

                    // --- MouseMove Handler ---
                    const handleMouseMove = (moveEvent) => {
                      const dx = moveEvent.clientX - dragStartPos.current.x;
                      const dy = moveEvent.clientY - dragStartPos.current.y;

                      // Only start dragging if threshold is met
                      if (!isDraggingRef.current && (Math.abs(dx) > dragThreshold || Math.abs(dy) > dragThreshold)) {
                        isDraggingRef.current = true;
                        // Update TransformWrapper state to disable panning during drag
                        setTransformState(prev => ({...prev})); 
                      }

                      if (isDraggingRef.current) {
                        // Use the current zoom scale from transformState
                        const scale = transformState.scale || 1;
                        // Calculate the unscaled cursor position relative to the image
                        const unscaledCursorX = (moveEvent.clientX - imageRect.left) / scale;
                        const unscaledCursorY = (moveEvent.clientY - imageRect.top) / scale;

                        // Update the pin position using pixel values during drag for responsiveness
                        target.style.left = `${unscaledCursorX}px`;
                        target.style.top = `${unscaledCursorY}px`;
                        // Ensure transform origin is correct for visual alignment
                        // We keep the translate(-50%, -100%) from the style prop transform, so origin isn't strictly needed here
                        // target.style.transformOrigin = 'center bottom'; // This might conflict with style prop transform
                      }
                    };

                    // --- MouseUp Handler ---
                    const handleMouseUp = (upEvent) => {
                      target.style.cursor = 'grab'; // Reset cursor
                      document.removeEventListener('mousemove', handleMouseMove);
                      document.removeEventListener('mouseup', handleMouseUp);

                      const tippyInstance = target._tippy; // Get tippy instance for potential hide

                      if (isDraggingRef.current) {
                        // --- Finalize Drag --- 
                        // (Tooltip should already be hidden from onMouseDown)
                        const scale = transformState.scale || 1;
                        const finalUnscaledX = (upEvent.clientX - imageRect.left) / scale;
                        const finalUnscaledY = (upEvent.clientY - imageRect.top) / scale;

                        // Compute final percentage based on the untransformed image dimensions
                        const finalX = finalUnscaledX / mapImageRef.current.offsetWidth;
                        const finalY = finalUnscaledY / mapImageRef.current.offsetHeight;
                        const clampedX = Math.max(0, Math.min(1, finalX));
                        const clampedY = Math.max(0, Math.min(1, finalY));

                        // Reset inline styles to use percentage-based positioning
                        target.style.left = `${clampedX * 100}%`;
                        target.style.top = `${clampedY * 100}%`;

                        console.log(`Pin ${pin._id} positioned at: x=${clampedX}, y=${clampedY}`);
                        onUpdatePinPosition(pin._id, { x: clampedX, y: clampedY });
                      } else {
                        // --- Handle Click (No Drag) ---
                        // Explicitly hide tooltip before navigation for unlocked pins
                        if (tippyInstance) tippyInstance.hide(); 
                        
                        // Navigate to the article since it wasn't a drag
                        onPinClick(pin.article?._id);
                      }

                      // Reset drag flag and re-enable panning in TransformWrapper
                      isDraggingRef.current = false;
                       setTransformState(prev => ({...prev})); 
                    };

                    // Add event listeners
                    document.addEventListener('mousemove', handleMouseMove);
                    document.addEventListener('mouseup', handleMouseUp);
                    // --- End of onMouseDown ---
                  }}
                  onClick={(e) => {
                    // Prevent default click behavior if dragging occurred
                    if (isDraggingRef.current) {
                      e.stopPropagation();
                      return;
                    }

                    // Handle click for LOCKED pins
                    if (pinsLocked) {
                       // Hide tooltip before navigating
                      const tippyInstance = e.currentTarget._tippy;
                      if (tippyInstance) tippyInstance.hide();
                      
                      e.stopPropagation(); // Prevent potential map interaction
                      onPinClick(pin.article?._id);
                    }
                    // Click for UNLOCKED pins is handled in onMouseDown/handleMouseUp logic
                  }}
                  onContextMenu={(e) => {
                     // Hide tooltip on context menu open
                    const tippyInstance = e.currentTarget._tippy;
                    if (tippyInstance) tippyInstance.hide();

                    e.stopPropagation(); // Prevent map context menu
                    handleContextMenu(e); // Show pin context menu
                  }}
                >
                  {renderPin(pin)}
                </div>
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