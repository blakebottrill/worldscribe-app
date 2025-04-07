import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar'; // We'll create this next
import './AppLayout.css'; // For layout styles

function AppLayout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Outlet /> {/* Child routes (WikiPage, AtlasPage, etc.) render here */}
      </main>
    </div>
  );
}

export default AppLayout; 