import { webSearch } from '../src/tools/search';

async function run() {
  const results = await webSearch('skriv dom 5 senaste nyheterna från Aftonbladet');
  console.log(JSON.stringify(results, null, 2));
}

run();
