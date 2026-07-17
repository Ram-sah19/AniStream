import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setMenuOpen(false);
    }
  };

  return (
    <nav className="navbar" id="main-navbar">
      <div className="navbar-container">
        {/* Logo */}
        <Link to="/" className="navbar-logo" id="navbar-logo">
          <span className="logo-icon">▶</span>
          <span className="logo-text">AniStream</span>
        </Link>

        {/* Desktop Navigation */}
        <div className={`navbar-links ${menuOpen ? 'active' : ''}`}>
          <Link to="/" className="nav-link" onClick={() => setMenuOpen(false)}>
            <span className="nav-icon">🏠</span> Home
          </Link>
          <Link to="/popular" className="nav-link" onClick={() => setMenuOpen(false)}>
            <span className="nav-icon">🔥</span> Popular
          </Link>
          <Link to="/watchlist" className="nav-link" onClick={() => setMenuOpen(false)}>
            <span className="nav-icon">📋</span> Watchlist
          </Link>
          <Link to="/favorites" className="nav-link" onClick={() => setMenuOpen(false)}>
            <span className="nav-icon">⭐</span> Favorites
          </Link>
        </div>

        {/* Search Bar */}
        <form className="navbar-search" onSubmit={handleSearch} id="navbar-search-form">
          <input
            type="text"
            className="search-input"
            placeholder="Search anime..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            id="search-input"
          />
          <button type="submit" className="search-btn" id="search-btn">
            🔍
          </button>
        </form>

        {/* Mobile Hamburger */}
        <button
          className={`hamburger ${menuOpen ? 'active' : ''}`}
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
