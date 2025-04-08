import React from 'react';
import * as FaIcons from 'react-icons/fa';
import './IconPicker.css';

// Expanded and Grouped Icons (Pruned & Reorganized Final)
const iconGroups = [
  {
    title: 'General & UI',
    icons: [
      // Basic UI & State
      'FaCog', 'FaSlidersH', 'FaCheck', 'FaCheckCircle', 'FaCheckDouble', 'FaCheckSquare', 'FaTimes', 'FaTimesCircle', 'FaTimesSquare', 
      'FaPlus', 'FaMinus', 'FaPlusSquare', 'FaMinusSquare', 'FaEllipsisH', 'FaEllipsisV', 
      // Actions
      'FaEdit', 'FaSave', 'FaTrashAlt', 'FaSearch', 'FaSearchPlus', 'FaSearchMinus', 
      'FaShare', 'FaShareAlt', 'FaShareSquare', 'FaUpload', 'FaDownload', 'FaPrint', 
      'FaReply', 'FaReplyAll', 'FaRedo', 'FaSync', 'FaSyncAlt', 'FaHistory', 
      // Linking & Info
      'FaLink', 'FaUnlink', 'FaExternalLinkAlt', 'FaExternalLinkSquareAlt', 'FaThumbtack', 'FaTag', 'FaTags',
      'FaInfoCircle', 'FaQuestionCircle', 'FaExclamationTriangle', 'FaExclamationCircle', 'FaExclamationSquare',
      // Communication
      'FaEnvelope', 'FaEnvelopeOpen', 'FaPaperclip', 
      // Time & Stream
      'FaStream', 'FaCalendarAlt', 'FaClock', 'FaHourglassHalf', // Moved from Time & Events
      // Misc
      'FaEye', 'FaEyeSlash', 'FaStar', 'FaHeart', 'FaHeartBroken', 'FaSign' // Removed FaBook, Symbols 
    ]
  },
  {
    title: 'Characters & Creatures',
    icons: [
      // Standard Users
      'FaUser', 'FaUsers', 'FaChild', 'FaFemale', 'FaMale', 'FaUserPlus', 'FaUserMinus', 'FaUserTimes', 'FaUserCheck', 
      // User Roles & Types
      'FaUserSecret', 'FaUserShield', 'FaUserNinja', 'FaUserAstronaut', 'FaUserGraduate', 'FaUserTie', 'FaUserInjured',
      'FaUserMd', 'FaUserHardHat', 'FaUserCog', 'FaUserEdit', 'FaUserClock', 'FaUserTag', 'FaUserCowboy', 'FaUserCrown', 
      'FaUsersCog', 'FaUsersSlash', 
      // Creatures & Fantasy
      'FaSkull', 'FaSkullCrossbones', 'FaGhost', 'FaDragon', 'FaHorse', 'FaHorseHead', 'FaPastafarianism',
      // Animals
      'FaHippo', 'FaOtter', 'FaDog', 'FaCat', 'FaDove', 'FaCrow', 'FaFish', 'FaFrog', 'FaKiwiBird', 'FaBug', 'FaSpider', 'FaPaw'
    ]
  },
  {
    title: 'Places & Maps',
    icons: [
      // Map Specific
      'FaMapMarkedAlt', 'FaMapPin', 'FaMapSigns', 'FaRoute', 'FaGlobeAmericas', 
      // Buildings & Structures
      'FaBuilding', 'FaCity', 'FaIndustry', 'FaWarehouse', 'FaHome', 'FaHomeAlt', 'FaHotel', 'FaSchool', 'FaUniversity',
      'FaHospital', 'FaHospitalAlt', 'FaClinicMedical', 'FaToilet', 
      // Landmarks & Places of Interest
      'FaLandmark', 'FaMonument', 'FaPlaceOfWorship', 'FaArchway', 'FaBroadcastTower', 'FaCampground',
      'FaCastle', 'FaChurch', 'FaDungeon', 'FaTemple', 'FaToriiGate', 'FaIgloo', 'FaBridge',
      // Natural Features
      'FaMountain', 'FaMountains', 'FaVolcano', 'FaWater'
    ]
  },
  {
    title: 'Items & Objects',
    icons: [
      // Books & Writing
      'FaBook', 'FaBookOpen', 'FaBookMedical', 'FaBookDead', 'FaBible', 'FaScroll', 'FaPenNib', 'FaSignature', 'FaStamp', // Added FaBook
      // Valuables & Containers
      'FaGem', 'FaRing', 'FaGift', 'FaKey', 'FaLock', 'FaLockOpen', 'FaCoins', 'FaShoppingBag', 'FaShoppingCart', 'FaSuitcaseRolling',
      // Tools & Weapons (Simple)
      'FaShieldAlt', 'FaAxe', 'FaScythe', 'FaAnchor', 'FaBomb', 
      // Measurement & Science
      'FaBalanceScale', 'FaMortarPestle', 'FaFlask', 'FaVial', 'FaVials', 'FaTablets',
      // Food & Drink
      'FaMugHot', 'FaWineBottle', 
      // Games & Recreation
      'FaDice', 'FaDiceD20', 'FaChessKing', 'FaChessQueen', 'FaChessRook', 'FaChessBishop', 'FaChessPawn', 'FaGuitar',
      // Magic & Fantasy
      'FaHatWizard', 'FaWandMagic', 
      // Modern & Furniture
      'FaMap', 'FaCameraRetro', 'FaKeyboard', 'FaLaptop', 'FaMobileAlt', 'FaHeadphones', 'FaMicrophone', 
      'FaBed', 'FaChair', 'FaCouch', 'FaLamp'
    ]
  },
  {
    title: 'Tools & Equipment',
    icons: [
      // Hand Tools
      'FaHammer', 'FaGavel', 'FaToolbox', 'FaWrench', 
      // Measurement & Science
      'FaMicroscope', 'FaTelescope', 'FaBinoculars', 'FaCompass', 
      // Art & Drafting
      'FaPalette', 'FaPaintBrush', 'FaEraser', 'FaRulerCombined', 'FaDraftingCompass', 
      // Medical & Office
      'FaBriefcase', 'FaBriefcaseMedical', 'FaMedkit'
    ]
  },
  {
    title: 'Nature & Elements',
    icons: [
      // Plants
      'FaTree', 'FaLeaf', 'FaSeedling', // Removed duplicate Seedling
      // Weather & Sky
      'FaCloud', 'FaCloudShowersHeavy', 'FaSnowflake', 'FaIcicles', 'FaBolt', 'FaSun', 'FaMoon', 'FaMeteor', 'FaRainbow',
      // Elements & Other
      'FaFeatherAlt', 'FaFire', 'FaWind', 'FaTint', 'FaSpa'
    ]
  }
  // Removed 'Symbols' and 'Time & Events' groups
];

const IconPicker = ({ onSelectIcon, onClose }) => {

  const handleIconClick = (iconName) => {
    onSelectIcon(iconName);
    onClose();
  };

  return (
    <div className="icon-picker-modal-backdrop" onClick={onClose}>
      <div className="icon-picker-modal-content" onClick={e => e.stopPropagation()}>
        <h4 className="modal-title">Select an Icon</h4>
        <div className="icon-groups-container"> {/* Container for scrolling groups */} 
          {iconGroups.map(group => (
            <div key={group.title} className="icon-group">
              <h5 className="icon-group-title">{group.title}</h5>
              <div className="icon-grid">
                {group.icons.map(name => {
                  const IconComponent = FaIcons[name];
                  if (!IconComponent) return null; 
                  return (
                    <button 
                      key={name} 
                      className="icon-button" 
                      onClick={() => handleIconClick(name)}
                      title={name}
                    >
                      <IconComponent size="1.5em" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="close-button">Close</button>
      </div>
    </div>
  );
};

export default IconPicker; 