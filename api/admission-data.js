const https = require('https');

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRV9_mpDA5cuhzG700dNNwD54BvOqBILqZkAlygrNNw9EW7L4N175UiAWwzBNF7TkWIpLJWJh6P-Tu4/pub?gid=1269439941&single=true&output=csv';

function fetchHttps(url, callback, errorCallback) {
  https.get(url, (res) => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      return fetchHttps(res.headers.location, callback, errorCallback);
    }
    if (res.statusCode !== 200) {
      return errorCallback(new Error(`Failed with status code: ${res.statusCode}`));
    }
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => { callback(data); });
  }).on('error', (err) => {
    errorCallback(err);
  });
}

module.exports = (req, res) => {
  // Add CORS headers for Vercel Serverless Function
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  fetchHttps(CSV_URL, (csvData) => {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.status(200).send(csvData);
  }, (err) => {
    res.status(500).json({ error: err.message });
  });
};
