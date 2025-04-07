import React from 'react';
import { NavLink } from 'react-router-dom';
import { FaBook, FaMapMarkedAlt, FaStream, FaCog } from 'react-icons/fa';
import './Sidebar.css';

function Sidebar() {
  // Placeholder data - replace with actual world data later
  const currentWorld = {
    name: 'Eldoria',
    description: 'A mystical realm of ancient magic and f...'
  };

  return (
    <aside className="sidebar">
      <div className="current-world-section">
        <span className="section-title">CURRENT WORLD</span>
        <h3>{currentWorld.name}</h3>
        <p>{currentWorld.description}</p>
        {/* Add world settings link/button later */}
      </div>

      <nav className="main-nav">
        <ul>
          <li>
            <NavLink
              to="/wiki" // Assuming base path is /wiki
              className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
            >
              <span className="nav-icon"><FaBook /></span> Wiki
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/atlas"
              className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
            >
              <span className="nav-icon"><FaMapMarkedAlt /></span> Atlas
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/timeline"
              className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
            >
              <span className="nav-icon"><FaStream /></span> Timeline
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/settings" // Assuming a settings path
              className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
            >
              <span className="nav-icon"><FaCog /></span> Settings
            </NavLink>
          </li>
        </ul>
      </nav>
      {/* Spacer to push user section down */}
      <div className="sidebar-spacer"></div>
      {/* Add User/Account section later */}
      <div className="user-section">
         {/* Placeholder user info */}
         <span>User Name</span>
         {/* Logout button etc */}
      </div>
    </aside>
  );
}

export default Sidebar; 