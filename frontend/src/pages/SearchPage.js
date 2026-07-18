import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import AnimeCard from '../components/AnimeCard';
import AdSlot from '../components/AdSlot';
import { searchAnime } from '../api';
import './SearchPage.css';

const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!query) return;

    const doSearch = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await searchAnime(query);
        setResults(data.results || []);
      } catch (err) {
        console.error('Search failed:', err);
        setError('Search failed. Make sure the backend is running.');
      } finally {
        setLoading(false);
      }
    };

    doSearch();
  }, [query]);

  return (
    <div className="search-page" id="search-page">
      <div className="search-container">
        <div className="search-header">
          <h1 className="search-title">
            <span className="title-icon-svg">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span> Search Results
          </h1>
          {query && (
            <p className="search-query">
              Showing results for: <strong>"{query}"</strong>
            </p>
          )}
        </div>

        {!query && (
          <div className="search-empty">
            <span className="empty-icon-svg">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <h2>Search for Donghua</h2>
            <p>Use the search bar above to find your favorite Chinese anime</p>
          </div>
        )}

        {loading && (
          <div className="anime-grid">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="skeleton-card">
                <div className="skeleton-image"></div>
                <div className="skeleton-info">
                  <div className="skeleton-line long"></div>
                  <div className="skeleton-line short"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="search-empty">
            <span className="empty-icon-svg red">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </span>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && query && results.length === 0 && (
          <div className="search-empty">
            <span className="empty-icon-svg">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 15h8" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>
            </span>
            <h2>No Results Found</h2>
            <p>Try a different search term or check spelling</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <>
            <p className="results-count">{results.length} results found</p>
            <div className="anime-grid" id="search-results-grid">
              {results.map((anime, index) => (
                <div
                  key={anime.id ? `search-${anime.id}-${index}` : `search-${anime.mal_id || index}`}
                  className="anime-grid-item"
                  style={{ animationDelay: `${index * 0.04}s` }}
                >
                  <AnimeCard anime={anime} />
                </div>
              ))}
            </div>
          </>
        )}

        <AdSlot position="banner" size="728x90" label="Advertisement Banner Slot — Search Page" />
      </div>
    </div>
  );
};

export default SearchPage;
