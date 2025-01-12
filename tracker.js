const express = require('express');
const axios = require('axios');

const app = express();
const port = 3000;

const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3/coins/markets';
const CURRENCY = 'usd';
const MAX_PAGES = 4; // Fetch top 1000 tokens

// Function to fetch the top 1000 tokens by paginating
async function fetchTopTokens() {
  const allData = [];
  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      console.log(`Fetching page ${page}...`);
      const response = await axios.get(COINGECKO_API_URL, {
        params: {
          vs_currency: CURRENCY,
          order: 'market_cap_desc',
          per_page: 250, // Maximum allowed per request
          page: page, // Fetch tokens page by page
          price_change_percentage: '1h,24h,7d',
        },
      });

      allData.push(...response.data);

      // Optional delay to prevent hitting rate limits
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second
    }

    console.log(`Fetched ${allData.length} tokens.`);
    return allData;
  } catch (error) {
    console.error('Error fetching data from CoinGecko:', error);
    return [];
  }
}

// Function to sort tokens by gainers and losers
function sortCrypto(data, changeKey) {
  const sorted = [...data].sort((a, b) => b[changeKey] - a[changeKey]);
  const gainers = sorted.slice(0, 20); // Top 20 gainers
  const losers = sorted.slice(-20).reverse(); // Top 20 losers
  return { gainers, losers };
}

// Route to display the tracker
app.get('/', async (req, res) => {
  const data = await fetchTopTokens();

  if (data.length === 0) {
    return res.status(500).send('Failed to fetch data from CoinGecko.');
  }

  // Sort tokens for hourly, daily, and weekly changes
  const hourly = sortCrypto(data, 'price_change_percentage_1h_in_currency');
  const daily = sortCrypto(data, 'price_change_percentage_24h_in_currency');
  const weekly = sortCrypto(data, 'price_change_percentage_7d_in_currency');

  // Generate HTML tables
  const generateTable = (title, coins, changeKey) => `
    <h3>${title}</h3>
    <table border="1">
      <tr>
        <th>Rank</th>
        <th>Name</th>
        <th>Symbol</th>
        <th>Price</th>
        <th>% Change</th>
        <th>Market Cap</th>
        <th>FDV</th>
      </tr>
      ${coins
        .map(
          (coin) => `
          <tr>
            <td>${coin.market_cap_rank}</td>
            <td>${coin.name.length > 10 ? coin.name.slice(0, 10) + '...' : coin.name}</td>
            <td>${coin.symbol.toUpperCase()}</td>
            <td>$${coin.current_price.toFixed(2)}</td>
            <td>${coin[changeKey] ? coin[changeKey].toFixed(2) : 'N/A'}%</td>
            <td>$${coin.market_cap ? coin.market_cap.toLocaleString() : 'N/A'}</td>
            <td>$${coin.fully_diluted_valuation ? coin.fully_diluted_valuation.toLocaleString() : 'N/A'}</td>
          </tr>
        `
        )
        .join('')}
    </table>
  `;

  // Send the HTML response
  res.send(`
    <html>
      <head>
        <title>Crypto Tracker</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: flex-start;
            padding: 20px;
            overflow-x: auto; /* Enable horizontal scrolling if needed */
          }
          .container {
            display: flex;
            gap: 10px;
          }
          .column {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          table {
            width: 400px; /* Reduce table width */
            text-align: center;
            border-collapse: collapse;
            font-size: 12px; /* Smaller font size */
          }
          th, td {
            padding: 4px; /* Reduce padding */
            text-overflow: ellipsis;
            white-space: nowrap; /* Prevent wrapping */
            overflow: hidden; /* Truncate content if too long */
          }
          th {
            font-size: 14px; /* Slightly larger font for headers */
          }
          h3 {
            text-align: center;
            font-size: 16px; /* Smaller titles */
          }
        </style>
      </head>
      <body>
        <h1>Crypto Tracker</h1>
        <div class="container">
          <div class="column">
            ${generateTable('Top 1H Gainers', hourly.gainers, 'price_change_percentage_1h_in_currency')}
            ${generateTable('Top 1H Losers', hourly.losers, 'price_change_percentage_1h_in_currency')}
          </div>
          <div class="column">
            ${generateTable('Top 24H Gainers', daily.gainers, 'price_change_percentage_24h_in_currency')}
            ${generateTable('Top 24H Losers', daily.losers, 'price_change_percentage_24h_in_currency')}
          </div>
          <div class="column">
            ${generateTable('Top 7D Gainers', weekly.gainers, 'price_change_percentage_7d_in_currency')}
            ${generateTable('Top 7D Losers', weekly.losers, 'price_change_percentage_7d_in_currency')}
          </div>
        </div>
      </body>
    </html>
  `);
});

// Start the server
app.listen(port, () => {
  console.log(`Crypto Tracker running at http://localhost:${port}`);
});


