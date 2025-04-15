import React, { useState, useEffect } from 'react';
import * as FaIcons from 'react-icons/fa';
import IconPicker from '../common/IconPicker';
import './PinEditModal.css';

// --- Contrast Calculation Utilities ---

// Function to parse hex color to RGB
function hexToRgb(hex) {
  let shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, function(m, r, g, b) {
    return r + r + g + g + b + b;
  });

  let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// Function to calculate relative luminance
function getLuminance(r, g, b) {
  let a = [r, g, b].map(function (v) {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

// Function to calculate contrast ratio between a color and white
function getContrastWithWhite(hexColor) {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return 1; // Default to low contrast if parse fails

  const lum1 = getLuminance(rgb.r, rgb.g, rgb.b);
  const lum2 = 1; // Luminance of white

  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);

  return (brightest + 0.05) / (darkest + 0.05);
}

// Function to determine icon color based on contrast
function getIconColorForContrast(pinColorHex) {
  const contrastThreshold = 3.0; // WCAG AA for graphical objects
  const contrast = getContrastWithWhite(pinColorHex);
  
  // If contrast with white is too low, use black icon
  return contrast < contrastThreshold ? '#000000' : '#FFFFFF';
}

// --- End Contrast Calculation Utilities ---

// Helper function to get vertical shift for centering shapes in viewBox
function getShapeVerticalShift(shapeId) {
  switch (shapeId) {
    case 'circle':
    case 'square':
    case 'arch':
    case 'shield':
      return 5; // Shapes using 0-20 height need shift down
    case 'flag':
    case 'ribbon':
      return 2.5; // Shapes using 0-25 height
    case 'chevron':
      return 2; // Shape using 0-26 height
    case 'pin':
    default:
      return 0; // Pin uses full height
  }
}

// Define SVG paths for custom pin shapes
const PIN_SHAPES = {
  'pin': 'M10,0 C4.5,0 0,4.5 0,10 C0,15.5 10,30 10,30 C10,30 20,15.5 20,10 C20,4.5 15.5,0 10,0 Z',
  'circle': 'M10,0 C4.5,0 0,4.5 0,10 C0,15.5 4.5,20 10,20 C15.5,20 20,15.5 20,10 C20,4.5 15.5,0 10,0 Z',
  'square': 'M0,0 H20 V20 H0 Z',
  'arch': 'M0,20 H20 V10 C20,4.5 15.5,0 10,0 C4.5,0 0,4.5 0,10 Z',
  'shield': 'M10,0 L20,5 V12 C20,16.5 15.5,20 10,20 C4.5,20 0,16.5 0,12 V5 Z',
  'flag': 'M0,0 H20 V25 L15,22.5 L10,25 L5,22.5 L0,25 Z',
  'ribbon': 'M0,0 H20 V25 L10,20 L0,25 Z',
  'chevron': 'M0,0 H20 V20 L10,26 L0,20 Z'
};

// Colors from the palette image
const COLORS = [
  // Row 1 - Black to white
  '#000000', '#333333', '#4D4D4D', '#666666', '#808080', '#999999', '#B3B3B3', '#CCCCCC', '#E6E6E6', '#FFFFFF',
  // Row 2 - Dark red to magenta
  '#800000', '#FF0000', '#FF8000', '#FFFF00', '#80FF00', '#00FFFF', '#0080FF', '#0000FF', '#8000FF', '#FF00FF',
  // Row 3 - Light brown to light pink
  '#D4A599', '#F4C2C2', '#FAE0D3', '#FFF2CC', '#E6F0D3', '#D2E3EB', '#D9E1F2', '#E2D3E6', '#EDD3DC', '#FAE1E6',
  // Row 4 - Darker earth tones
  '#BC8557', '#DD9F82', '#E8C39E', '#F2E1BD', '#C6D8A8', '#95BED0', '#A4C2F4', '#B5A6D3', '#D5A6BD', '#E6B3B3',
  // Row 5 - Medium tones
  '#A44A2A', '#D86C54', '#E0A867', '#E0C773', '#A8C766', '#67A2B8', '#6D9EEB', '#8E7CC3', '#C27BA0', '#CC6677',
  // Row 6 - Dark tones
  '#7F2E1A', '#983C0B', '#AC7F27', '#A09026', '#6B8E23', '#316F8C', '#3D5DAB', '#684193', '#8B4868', '#A30000',
  // Row 7 - Darkest tones
  '#5C1E0E', '#6B2A05', '#705E1A', '#6A5E19', '#3F5218', '#1B4154', '#1C3055', '#3E2757', '#5A2F45', '#740000',
  // Row 8 - Deep tones
  '#4A1809', '#552008', '#4D3C0D', '#3F3808', '#2C390C', '#0C2230', '#0A1A30', '#271737', '#3C1F2D', '#490000',
];

const PinEditModal = ({ 
  pin,
  linkedArticle, 
  onSave, 
  onClose,
  articles,
  onArticleLinkClick
}) => {
  // Tab handling
  const [activeTab, setActiveTab] = useState('icon');

  // Icon handling
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState(pin?.icon || linkedArticle?.icon || 'FaHome');
  const [iconId, setIconId] = useState(pin?.iconId || linkedArticle?.iconId || null);
  
  // Shape, color, display type
  const [selectedShape, setSelectedShape] = useState(pin?.shape || 'pin');
  const [selectedColor, setSelectedColor] = useState(pin?.color || '#dc3545');
  const [customColor, setCustomColor] = useState(pin?.color || '#dc3545');
  const [displayType, setDisplayType] = useState(pin?.displayType || 'pin+icon');
  
  // Custom color hex input
  const [customHexValue, setCustomHexValue] = useState(pin?.color || '#dc3545');

  // Sync with article icon if using shared icon and article has changed
  useEffect(() => {
    if (selectedIcon !== linkedArticle?.icon) {
      setIconId(`icon_${Date.now()}`);
    }
  }, [selectedIcon, linkedArticle]);

  const handleColorSelect = (color) => {
    if (color === 'custom') {
      // Show custom color input
      document.getElementById('custom-color-input').click();
    } else {
      setSelectedColor(color);
      setCustomColor(color);
      setCustomHexValue(color);
    }
  };

  const handleCustomColorChange = (e) => {
    const color = e.target.value;
    setCustomColor(color);
    setCustomHexValue(color);
    setSelectedColor(color);
  };
  
  const handleHexInputChange = (e) => {
    const hex = e.target.value;
    // Basic hex validation
    if (/^#([0-9A-F]{3}){1,2}$/i.test(hex) || /^([0-9A-F]{3}){1,2}$/i.test(hex)) {
      const formattedHex = hex.startsWith('#') ? hex : `#${hex}`;
      setCustomHexValue(formattedHex);
      setCustomColor(formattedHex);
      setSelectedColor(formattedHex);
    } else {
      setCustomHexValue(hex); // Still update the input field
    }
  };

  const handleSave = () => {
    const updatedPinData = {
      icon: selectedIcon,
      iconId: iconId,
      shape: selectedShape,
      color: selectedColor,
      displayType: displayType
    };
    // Call onSave with the expected structure
    onSave({ 
      pin: pin, // Pass the original pin object under the 'pin' key
      linkedArticle: linkedArticle, // Pass the linked article
      ...updatedPinData // Spread the updated fields
    });
  };

  const handleIconSelect = (iconName) => {
    setSelectedIcon(iconName);
    setShowIconPicker(false);
    
    // If we're no longer using the same icon as the article, turn off sharing
    if (iconName !== linkedArticle?.icon) {
      setIconId(`icon_${Date.now()}`); // Generate a new iconId for this pin
    }
  };

  // Render the appropriate icon component
  const renderIcon = (iconName, size = '1.5em', color = 'currentColor') => {
    if (!iconName) return null;
    const IconComponent = FaIcons[iconName];
    return IconComponent ? <IconComponent size={size} color={color} /> : null;
  };

  // Render the shape with the selected icon inside
  const renderPinPreview = () => {
    // Determine which icon to show
    const IconComponent = FaIcons[selectedIcon] || FaIcons.FaHome;
    const shapePath = PIN_SHAPES[selectedShape] || PIN_SHAPES.pin;
    const pinColor = selectedColor; // Use the state variable for color
    const iconColor = getIconColorForContrast(pinColor); // Determine icon color for preview
    
    // Handle icon-only case separately (no SVG shape)
    if (displayType === 'icon-only') {
      return (
        <div className="pin-preview icon-only-pin-preview">
          <div style={{ 
            boxShadow: 'none', // Match MapView style
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '30px', // Maintain preview size
            height: '30px', // Maintain preview size
            // Apply filter for stroke effect
            filter: 'drop-shadow(0px 0px 1px rgba(0, 0, 0, 1)) drop-shadow(0px 0px 1px rgba(0, 0, 0, 1)) drop-shadow(0px 0px 1px rgba(0, 0, 0, 1))'
          }}>
            {/* Icon-only preview should also use white icon with black stroke */}
            <IconComponent color="#FFFFFF" size="1.2em" /> 
          </div>
        </div>
      );
    }
    
    // Render the SVG shape for pin+icon or hide-icon
    return (
      <div className="pin-preview">
        <div className="pin-shape" style={{ width: '40px', height: '60px' }}> {/* Increased size */} 
          <svg width="100%" height="100%" viewBox="0 0 20 30" xmlns="http://www.w3.org/2000/svg" 
            style={{
              filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.5))',
              overflow: 'visible' // Match MapView style
            }}>
            {/* Black Outer Stroke */}
            <path d={shapePath} fill="none" stroke="#000000" strokeWidth="3" strokeLinejoin="round"/>
            {/* White Inner Stroke + Fill */}
            <path d={shapePath} fill={pinColor} stroke="#FFFFFF" strokeWidth="1.5" strokeLinejoin="round"/>
            
            {/* Icon embedded inside SVG using foreignObject */}
            {displayType !== 'hide-icon' && (
              <foreignObject 
                x="3" 
                y={selectedShape === 'chevron' ? '4.5' : (selectedShape === 'flag' ? '4.5' : '3')} 
                width="14" 
                height="14"
              > 
                <div xmlns="http://www.w3.org/1999/xhtml" style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <IconComponent size="90%" color={iconColor} /> {/* Use calculated icon color */}
                </div>
              </foreignObject>
            )}
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className="pin-edit-modal-overlay" onClick={onClose}>
      <div className="pin-edit-modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="tab-navigation">
            <button 
              className={`tab-button ${activeTab === 'icon' ? 'active' : ''}`}
              onClick={() => setActiveTab('icon')}
            >
              Pin
            </button>
            <button 
              className={`tab-button ${activeTab === 'article' ? 'active' : ''}`}
              onClick={() => setActiveTab('article')}
            >
              Article
            </button>
          </div>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        {/* Content area based on active tab */}
        <div className="tab-content">
          {/* ICON TAB */}
          {activeTab === 'icon' && (
            <div className="icon-tab-content">
              {/* Pin preview at the top center */}
              <div className="pin-preview-container">
                {renderPinPreview()}
              </div>

              {/* Display type selection */}
              <div className="section">
                <h3 className="section-label">TYPE</h3>
                <div className="display-options">
                  <label className="display-option">
                    <input 
                      type="radio" 
                      name="display-type" 
                      checked={displayType === 'pin+icon'} 
                      onChange={() => setDisplayType('pin+icon')}
                    />
                    <span className="display-label">Show Pin + Icon</span>
                  </label>
                  <label className="display-option">
                    <input 
                      type="radio" 
                      name="display-type" 
                      checked={displayType === 'hide-icon'} 
                      onChange={() => setDisplayType('hide-icon')}
                    />
                    <span className="display-label">Hide Icon</span>
                  </label>
                  <label className="display-option">
                    <input 
                      type="radio" 
                      name="display-type" 
                      checked={displayType === 'icon-only'} 
                      onChange={() => setDisplayType('icon-only')}
                    />
                    <span className="display-label">Icon Only</span>
                  </label>
                </div>
              </div>

              {/* Icon selection */}
              <div className="section">
                <h3 className="section-label">ICON</h3>
                
                <div className="icon-selector">
                  <button 
                    className="change-icon-button" 
                    onClick={() => setShowIconPicker(true)}
                  >
                    {renderIcon(selectedIcon)} 
                    Change Icon
                  </button>
                </div>
              </div>

              {/* Shape selection */}
              <div className="section">
                <h3 className="section-label">SHAPE</h3>
                <div className="shape-options">
                  {Object.keys(PIN_SHAPES).map(shapeId => (
                    <button
                      key={shapeId}
                      className={`shape-button ${selectedShape === shapeId ? 'selected' : ''}`}
                      onClick={() => setSelectedShape(shapeId)}
                      title={shapeId.charAt(0).toUpperCase() + shapeId.slice(1)}
                    >
                      <svg width="100%" height="100%" viewBox="0 0 20 30" xmlns="http://www.w3.org/2000/svg">
                        <path 
                          d={PIN_SHAPES[shapeId]} 
                          fill="currentColor" 
                          transform={`translate(0, ${getShapeVerticalShift(shapeId)})`}
                        />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color selection */}
              <div className="section">
                <h3 className="section-label">COLOR</h3>
                <div className="color-picker-grid">
                  {COLORS.map(color => (
                    <button
                      key={color}
                      className={`color-swatch ${selectedColor === color ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => handleColorSelect(color)}
                    />
                  ))}
                </div>
                <div className="custom-color-section">
                  <div className="custom-color-preview" style={{ backgroundColor: customColor }}></div>
                  <input 
                    type="text"
                    value={customHexValue}
                    onChange={handleHexInputChange}
                    placeholder="#RRGGBB"
                    className="custom-color-hex"
                  />
                  <input
                    id="custom-color-input"
                    type="color" 
                    value={customColor}
                    onChange={handleCustomColorChange}
                    className="custom-color-picker"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ARTICLE TAB */}
          {activeTab === 'article' && (
            <div className="article-tab-content">
              <h3>Linked Article</h3>
              {linkedArticle ? (
                <div className="linked-article-info">
                  <div className="article-icon-title">
                    {renderIcon(linkedArticle.icon, '1.5em')}
                    <span>{linkedArticle.title}</span>
                  </div>
                  <button 
                    className="edit-article-link-button"
                    onClick={() => {
                      if (onArticleLinkClick) {
                        onArticleLinkClick(pin);
                        onClose();
                      }
                    }}
                  >
                    Change linked article
                  </button>
                </div>
              ) : (
                <div className="no-article-linked">
                  <p>No article linked to this pin</p>
                  <button 
                    className="link-article-button"
                    onClick={() => {
                      if (onArticleLinkClick) {
                        onArticleLinkClick(pin);
                        onClose();
                      }
                    }}
                  >
                    Link to an article
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer with action buttons */}
        <div className="modal-footer">
          <button onClick={onClose} className="cancel-button">Cancel</button>
          <button onClick={handleSave} className="save-button">Save Changes</button>
        </div>
      </div>

      {/* Icon Picker Modal */}
      {showIconPicker && (
        <IconPicker
          onSelectIcon={handleIconSelect}
          onClose={() => setShowIconPicker(false)}
        />
      )}
    </div>
  );
};

export default PinEditModal; 