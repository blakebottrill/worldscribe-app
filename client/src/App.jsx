import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast'; // Import Toaster
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'; // Import DevTools
import AppLayout from './components/layout/AppLayout'; // Import the layout
import WikiPage from './pages/WikiPage';
import AtlasPage from './pages/AtlasPage';
import TimelinePage from './pages/TimelinePage';
// import CalendarPage from './pages/CalendarPage';
// import SettingsPage from './pages/SettingsPage'; // Assuming future page
// import LoginPage from './pages/LoginPage'; // Assuming future page
// import HomePage from './pages/HomePage'; // Placeholder if needed

function App() {
  return (
    <>
      <Toaster // Add Toaster component here
        position="top-right"
        reverseOrder={false}
        toastOptions={{
          // Default options for specific types
          success: {
            duration: 3000,
            theme: {
              primary: 'green',
              secondary: 'black',
            },
          },
           error: {
             duration: 5000,
           },
        }}
      />
      <Routes>
        <Route path="/" element={<AppLayout />}>
          {/* Nested routes render inside AppLayout's <Outlet> */}
          {/* <Route index element={<HomePage />} /> Default route */}
          <Route path="wiki" element={<WikiPage />} />
          <Route path="atlas" element={<AtlasPage />} />
          <Route path="timeline" element={<TimelinePage />} />
          {/* <Route path="settings" element={<SettingsPage />} /> */}
          {/* Default to wiki page if no index route */}
          <Route index element={<WikiPage />} /> 
        </Route>
        {/* Routes outside the main layout, e.g., Login */}
        {/* <Route path="/login" element={<LoginPage />} /> */}
      </Routes>
      {/* Add DevTools, typically only in development */}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </>
  );
}

export default App;
