import axios from 'axios';
import * as cheerio from 'cheerio';

async function run() {
  try {
    const response = await axios.get('https://rss.aftonbladet.se/rss2/small/pages/sections/senastenytt/', {
      timeout: 5000
    });
    const $ = cheerio.load(response.data, { xmlMode: true });
    $(`item`).each((i, el) => {
      if (i < 5) {
        console.log($(el).find('title').text());
        console.log($(el).find('link').text());
      }
    });
  } catch(e) {
    console.log(e.message);
  }
}
run();
