
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
  const url = `https://lite.duckduckgo.com/lite/`;
  const results: SearchResult[] = [];

  // Advanced sanitization of conversational prompts to ensure keyword matches
  let sanitized = query.toLowerCase();
  const prefixes = [
    "skriv dom 5 senaste nyheterna från",
    "skriv de", "skriv dom", "5 senaste nyheterna från", "senaste nyheterna på", "vad är", "kan du",
    "nyheter från", "nyheter på", "senaste"
  ];
  for (const p of prefixes) {
     sanitized = sanitized.replace(new RegExp(p, "gi"), "").trim();
  }
  // Remove question marks and extra spaces
  sanitized = sanitized.replace(/[?.,!]+/g, "").replace(/\s+/g, " ").trim();
  
  if (!sanitized) sanitized = query; // Fallback if we stripped everything

  try {
    const response = await axios.post(url, `q=${encodeURIComponent(sanitized)}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        // Use a simpler UA to avoid DDG automated anti-bot tripping
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) rv:109.0 Gecko/20100101 Firefox/115.0',
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);

    // DuckDuckGo Lite structure:
    $('table tr').each((i, el) => {
      const link = $(el).find('a.result-link');
      if (link.length > 0) {
        const title = link.text().trim();
        const href = link.attr('href') || '';
        
        // Find the snippet by looking up to 3 rows ahead
        let snippet = '';
        let nextRow = $(el).next();
        for (let j = 0; j < 3; j++) {
          const text = nextRow.find('.result-snippet').text().trim();
          if (text) {
             snippet = text;
             break;
          }
          nextRow = nextRow.next();
        }

        if (title && href && results.length < 5) {
          results.push({
            title,
            url: href.startsWith('//') ? `https:${href}` : href,
            snippet: snippet || 'No snippet available.'
          });
        }
      }
    });

    console.log(`[WebSearch] Found ${results.length} results for query: "${query}"`);

    return results.slice(0, 5); // Return top 5 results
  } catch (error) {
    console.error('[WebSearch] Failed to fetch results:', error);
    return [];
  }
}
