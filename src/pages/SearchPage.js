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
            🔍 Search Results
          </h1>
          {query && (
            <p className="search-query">
              Showing results for: <strong>"{query}"</strong>
            </p>
          )}
        </div>

        {!query && (
          <div className="search-empty">
            <span>🔎</span>
            <h2>Search for Anime</h2>
            <p>Use the search bar above to find your favorite anime</p>
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
            <span>⚠️</span>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && query && results.length === 0 && (
          <div className="search-empty">
            <span>😕</span>
            <h2>No Results Found</h2>
            <p>Try a different search term</p>
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
