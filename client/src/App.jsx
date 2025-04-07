import { useState } from 'react'
import { Routes, Route, Link } from 'react-router-dom';

// Pages & Components
import HomePage from './pages/HomePage';
import WikiPage from './pages/WikiPage';
import AtlasPage from './pages/AtlasPage';
import TimelinePage from './pages/TimelinePage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  // Basic state for demo purposes, will integrate Supabase auth later
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <div className="App">
      <nav>
        <ul>
          <li><Link to="/">Home</Link></li>
          <li><Link to="/wiki">Wiki</Link></li>
          <li><Link to="/atlas">Atlas</Link></li>
          <li><Link to="/timeline">Timeline</Link></li>
          <li>
            {isLoggedIn ? (
              <button onClick={() => setIsLoggedIn(false)}>Logout</button>
            ) : (
              <Link to="/login">Login</Link>
            )}
          </li>
        </ul>
      </nav>

      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/wiki/*" element={<WikiPage />} />
          <Route path="/atlas" element={<AtlasPage />} />
          <Route path="/timeline" element={<TimelinePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
