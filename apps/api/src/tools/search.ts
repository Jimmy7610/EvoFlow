
import axios from 'axios';
import * as cheerio from 'cheerio';

export interface SearchResult {
  title: string;
  snippet: string;
  url: string;
}

/**
 * A zero-config web search tool using DuckDuckGo Lite.
 * Privacy-respecting and works without API keys.
 */
export async function webSearch(query: string): Promise<SearchResult[]> {
  const url = `https://lite.duckduckgo.com/lite/search?q=${encodeURIComponent(query)}`;
  const results: SearchResult[] = [];

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'sv-SE,sv;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);

    // DuckDuckGo Lite structure refinement
    $('table').each((tableIdx, table) => {
      $(table).find('tr').each((trIdx, tr) => {
        // Look for links that aren't ads or internal
        const links = $(tr).find('a').filter((_, a) => {
          const h = $(a).attr('href') || '';
          return !h.includes('duckduckgo.com') && !h.startsWith('/');
        });

        if (links.length > 0) {
          const link = $(links[0]);
          const title = link.text().trim();
          const href = link.attr('href') || '';
          
          // Sneak peek at the next row for snippets
          const snippetText = $(tr).next().find('td').text().trim() || 
                             $(tr).parent().find('tr').eq(trIdx + 1).text().trim();

          if (title && href && results.length < 5) {
            results.push({
              title,
              url: href,
              snippet: snippetText.substring(0, 300) || 'No snippet available.'
            });
          }
        }
      });
    });

    return results.slice(0, 5); // Return top 5 results
  } catch (error) {
    console.error('[WebSearch] Failed to fetch results:', error);
    return [];
  }
}
