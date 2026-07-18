import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <nav className={`navbar${scrolled ? ' scrolled' : ''}`} id="main-navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo" id="navbar-logo">
          <span className="logo-icon">🐉</span>
          <span className="logo-text">DonghuaStream</span>
        </Link>

        <div className={`navbar-links${menuOpen ? ' active' : ''}`}>
          <Link to="/" className={`nav-link${isActive('/') ? ' active' : ''}`}>
            <span className="nav-icon">🏠</span> Home
          </Link>
          <Link to="/popular" className={`nav-link${isActive('/popular') ? ' active' : ''}`}>
            <span className="nav-icon">🔥</span> Popular
          </Link>
          <Link to="/watchlist" className={`nav-link${isActive('/watchlist') ? ' active' : ''}`}>
            <span className="nav-icon">📋</span> Watchlist
          </Link>
          <Link to="/favorites" className={`nav-link${isActive('/favorites') ? ' active' : ''}`}>
            <span className="nav-icon">⭐</span> Favorites
          </Link>
        </div>

        <form className="navbar-search" onSubmit={handleSearch} id="navbar-search-form">
          <input
            type="text"
            className="search-input"
            placeholder="Search donghua..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            id="search-input"
          />
          <button type="submit" className="search-btn" id="search-btn">🔍</button>
        </form>

        <button
          className={`hamburger${menuOpen ? ' active' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          id="hamburger-btn"
          aria-label="Toggle navigation menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
