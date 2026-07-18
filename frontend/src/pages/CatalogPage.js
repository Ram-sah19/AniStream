import React, { useState, useEffect } from 'react';
import AnimeCard from '../components/AnimeCard';
import { fetchCatalog } from '../api';
import './CatalogPage.css';

const GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 
  'Mystery', 'Romance', 'Sci-Fi', 'Supernatural', 'Thriller'
];

const SORTS = [
  { value: 'POPULARITY_DESC', label: 'Most Popular' },
  { value: 'TRENDING_DESC', label: 'Trending' },
  { value: 'SCORE_DESC', label: 'Highest Rated' },
  { value: 'START_DATE_DESC', label: 'Latest Releases' }
];

const CatalogPage = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter states
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedSort, setSelectedSort] = useState('POPULARITY_DESC');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [pageInfo, setPageInfo] = useState({
    hasNextPage: false,
    lastPage: 1,
    currentPage: 1
  });

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(1); // Reset page on new search
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const params = {
          page,
          sort: selectedSort
        };
        
        if (selectedGenre) params.genre = selectedGenre;
        if (debouncedQuery) params.search = debouncedQuery;
        
        const data = await fetchCatalog(params);
        setResults(data.results || []);
        if (data.pageInfo) {
          setPageInfo(data.pageInfo);
        }
      } catch (err) {
        console.error('Failed to fetch catalog:', err);
        setError('Failed to load the donghua catalog. Please ensure the backend is running.');
      } finally {
        setLoading(false);
      }
    };
    
    loadCatalog();
  }, [page, selectedGenre, selectedSort, debouncedQuery]);

  const handleGenreChange = (genre) => {
    setSelectedGenre(genre === selectedGenre ? '' : genre);
    setPage(1); // Reset page
  };

  return (
    <div className="catalog-page" id="catalog-page">
      <div className="catalog-container">
        
        {/* Header */}
        <div className="catalog-header">
          <h1 className="catalog-title">
            <span className="catalog-icon-svg">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </span> Browse Donghua Catalog
          </h1>
          <p className="catalog-subtitle">Explore the complete collection of Chinese animation series</p>
        </div>

        {/* Filters Controls */}
        <div className="catalog-controls">
          
          {/* Search bar inside catalog */}
          <div className="catalog-search-bar">
            <span className="search-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input 
              type="text" 
              placeholder="Search by name..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-search-btn" onClick={() => setSearchQuery('')}>×</button>
            )}
          </div>

          {/* Sort Selection dropdown */}
          <div className="catalog-sort">
            <label htmlFor="sort-select">Sort By:</label>
            <select 
              id="sort-select"
              value={selectedSort}
              onChange={(e) => { setSelectedSort(e.target.value); setPage(1); }}
            >
              {SORTS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Genre Badges / Tags */}
        <div className="catalog-genres-filter">
          <span className="filter-label">Filter by Genre:</span>
          <div className="genre-badges-list">
            <button 
              className={`genre-filter-btn ${selectedGenre === '' ? 'active' : ''}`}
              onClick={() => { setSelectedGenre(''); setPage(1); }}
            >
              All Genres
            </button>
            {GENRES.map(g => (
              <button
                key={g}
                className={`genre-filter-btn ${selectedGenre === g ? 'active' : ''}`}
                onClick={() => handleGenreChange(g)}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Catalog Content */}
        {loading ? (
          <div className="anime-grid">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="skeleton-card">
                <div className="skeleton-image"></div>
                <div className="skeleton-info">
                  <div className="skeleton-line long"></div>
                  <div className="skeleton-line short"></div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="error-message">
            <span>⚠️</span>
            <p>{error}</p>
          </div>
        ) : results.length === 0 ? (
          <div className="catalog-empty">
            <span>😕</span>
            <h2>No Donghua Found</h2>
            <p>We couldn't find any results matching your search criteria. Try removing filters or searching for something else.</p>
          </div>
        ) : (
          <>
            <div className="anime-grid" id="catalog-grid">
              {results.map((anime, index) => (
                <div 
                  key={anime.id ? `catalog-${anime.id}-${index}` : `catalog-${index}`}
                  className="anime-grid-item"
                  style={{ animationDelay: `${(index % 12) * 0.03}s` }}
                >
                  <AnimeCard anime={anime} />
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            <div className="catalog-pagination">
              <button 
                className="pagination-btn"
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(p - 1, 1))}
              >
                ← Prev
              </button>
              
              <span className="pagination-info">
                Page <strong>{page}</strong> of <strong>{pageInfo.lastPage || page}</strong>
              </span>

              <button 
                className="pagination-btn"
                disabled={!pageInfo.hasNextPage}
                onClick={() => setPage(p => p + 1)}
              >
                Next →
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
};

export default CatalogPage;
