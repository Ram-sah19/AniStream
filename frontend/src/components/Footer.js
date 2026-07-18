import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer" id="site-footer">
      <div className="footer-container">
        <div className="footer-top">
          {/* Brand */}
          <div className="footer-brand">
            <Link to="/" className="footer-logo">
              <span className="footer-logo-icon">🐉</span>
              <span className="footer-logo-text">DonghuaStream</span>
            </Link>
            <p className="footer-desc">
              Your ultimate destination for Chinese anime (Donghua). Watch thousands of
              episodes from top studios like Tencent, Bilibili, and iQIYI for free.
            </p>
          </div>

          {/* Quick Links */}
          <div className="footer-links-group">
            <h4>Quick Links</h4>
            <Link to="/">Home</Link>
            <Link to="/popular">Popular</Link>
            <Link to="/watchlist">Watchlist</Link>
            <Link to="/favorites">Favorites</Link>
          </div>

          {/* Genres */}
          <div className="footer-links-group">
            <h4>Genres</h4>
            <span>Action</span>
            <span>Cultivation</span>
            <span>Fantasy</span>
            <span>Romance</span>
          </div>

          {/* Legal */}
          <div className="footer-links-group">
            <h4>Legal</h4>
            <span>Terms of Service</span>
            <span>Privacy Policy</span>
            <span>DMCA</span>
            <span>Contact</span>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} DonghuaStream. All rights reserved.</p>
          <p className="footer-disclaimer">
            This site does not store any files on its server. All contents are provided by non-affiliated third parties.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
