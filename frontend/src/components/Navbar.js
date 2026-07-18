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
          <span className="logo-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 22H22L12 2Z" fill="currentColor" />
              <path d="M12 6L4 20H20L12 6Z" fill="#e8a830" />
            </svg>
          </span>
          <span className="logo-text">DonghuaStream</span>
        </Link>

        <div className={`navbar-links${menuOpen ? ' active' : ''}`}>
          <Link to="/" className={`nav-link${isActive('/') ? ' active' : ''}`}>
            Home
          </Link>
          <Link to="/catalog" className={`nav-link${isActive('/catalog') ? ' active' : ''}`}>
            Browse
          </Link>
          <Link to="/popular" className={`nav-link${isActive('/popular') ? ' active' : ''}`}>
            Popular
          </Link>
          <Link to="/watchlist" className={`nav-link${isActive('/watchlist') ? ' active' : ''}`}>
            Watchlist
          </Link>
          <Link to="/favorites" className={`nav-link${isActive('/favorites') ? ' active' : ''}`}>
            Favorites
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
          <button type="submit" className="search-btn" id="search-btn">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
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
