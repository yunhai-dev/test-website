/**
 * Client-side search functionality for static site
 * Uses a pre-generated search index (search-index.json)
 */

(function() {
    'use strict';

    let searchIndex = null;
    let searchInput = null;
    let searchResults = null;
    let debounceTimer = null;

    // Initialize search when DOM is ready
    document.addEventListener('DOMContentLoaded', init);

    function init() {
        searchInput = document.querySelector('.search-form input[name="q"]');
        searchResults = document.getElementById('search-results');
        
        if (!searchInput || !searchResults) return;

        // Prevent form submission, use client-side search
        const searchForm = document.querySelector('.search-form');
        if (searchForm) {
            searchForm.addEventListener('submit', function(e) {
                e.preventDefault();
                performSearch(searchInput.value);
            });
        }

        // Real-time search with debounce
        searchInput.addEventListener('input', function() {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(function() {
                performSearch(searchInput.value);
            }, 300);
        });

        // Close results when clicking outside
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.header-search-widget')) {
                hideResults();
            }
        });

        // Load search index
        loadSearchIndex();
    }

    function loadSearchIndex() {
        // Get base URL from global variable set in template
        const baseUrl = window.SITE_BASE_URL || '';
        const indexUrl = baseUrl + '/search-index.json';
        
        fetch(indexUrl)
            .then(response => response.json())
            .then(data => {
                searchIndex = data;
                console.log('Search index loaded:', searchIndex.length, 'articles');
            })
            .catch(err => {
                console.warn('Search index not available:', err);
            });
    }

    function performSearch(query) {
        if (!query || query.length < 2) {
            hideResults();
            return;
        }

        if (!searchIndex) {
            showResults([{
                title: 'Search index loading...',
                excerpt: 'Please wait a moment and try again.',
                url: '#'
            }]);
            return;
        }

        const results = search(query);
        
        if (results.length === 0) {
            showResults([{
                title: 'No results found',
                excerpt: 'Try different keywords or browse our categories.',
                url: '#'
            }]);
        } else {
            showResults(results.slice(0, 8)); // Show top 8 results
        }
    }

    function search(query) {
        const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);
        const results = [];

        searchIndex.forEach(function(article) {
            let score = 0;
            const titleLower = article.title.toLowerCase();
            const excerptLower = (article.excerpt || '').toLowerCase();
            const tagsLower = (article.tags || []).join(' ').toLowerCase();

            terms.forEach(function(term) {
                // Title match (highest weight)
                if (titleLower.includes(term)) {
                    score += 10;
                    // Exact word match bonus
                    if (titleLower.split(/\s+/).includes(term)) {
                        score += 5;
                    }
                }
                
                // Excerpt match
                if (excerptLower.includes(term)) {
                    score += 3;
                }
                
                // Tags match
                if (tagsLower.includes(term)) {
                    score += 5;
                }
            });

            if (score > 0) {
                results.push({
                    ...article,
                    score: score
                });
            }
        });

        // Sort by score descending
        results.sort((a, b) => b.score - a.score);
        
        return results;
    }

    function showResults(results) {
        let html = '<div class="search-results-inner">';
        
        results.forEach(function(result) {
            const isPlaceholder = result.url === '#';
            html += `
                <a href="${result.url}" class="search-result-item ${isPlaceholder ? 'placeholder' : ''}">
                    <div class="result-title">${escapeHtml(result.title)}</div>
                    ${result.channel ? `<div class="result-channel">${escapeHtml(result.channel)}</div>` : ''}
                    <div class="result-excerpt">${escapeHtml(result.excerpt || '').substring(0, 100)}...</div>
                </a>
            `;
        });
        
        html += '</div>';
        
        searchResults.innerHTML = html;
        searchResults.classList.add('active');
    }

    function hideResults() {
        searchResults.classList.remove('active');
        searchResults.innerHTML = '';
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
})();
