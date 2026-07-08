const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRV9_mpDA5cuhzG700dNNwD54BvOqBILqZkAlygrNNw9EW7L4N175UiAWwzBNF7TkWIpLJWJh6P-Tu4/pub?gid=1269439941&single=true&output=csv';

// MIME types for static files
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

// Helper function to fetch data over HTTPS with redirect support (Node.js has ZERO CORS restrictions!)
function fetchHttps(url, callback, errorCallback) {
  https.get(url, (res) => {
    // Handle redirects (Google Sheets uses 307 Temporary Redirect)
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

const server = http.createServer((req, res) => {
  // Add CORS headers to all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // API Endpoint: Node.js fetches Google Sheets CSV directly without browser CORS blocks!
  if (req.url === '/api/admission-data' || req.url === '/api/data') {
    console.log('📡 [API] Fetching CSV from Google Sheets via Node.js Backend...');
    fetchHttps(CSV_URL, (csvData) => {
      res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8' });
      res.end(csvData);
      console.log('✅ [API] CSV data successfully sent to browser!');
    }, (err) => {
      console.error('❌ [API Error]:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: err.message }));
    });
    return;
  }

  // Static File Server (serves index.html, styles.css, app.js)
  let filePath = '.' + req.url;
  if (filePath === './') {
    filePath = './index.html';
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>404 Not Found</h1><p>ไม่พบไฟล์ที่ต้องการ</p>', 'utf-8');
      } else {
        res.writeHead(500);
        res.end('Server Error: ' + error.code, 'utf-8');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log('\n==================================================');
  console.log('🚀 Node.js Server is running without dependencies!');
  console.log('👉 Open your browser at: http://localhost:' + PORT);
  console.log('📡 API Proxy active at:  http://localhost:' + PORT + '/api/admission-data');
  console.log('==================================================\n');
});
