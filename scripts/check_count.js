const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  content.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      env[key.trim()] = valueParts.join('=').trim();
    }
  });
  return env;
}

function curl(url, headers) {
  let command = `curl -s -L "${url}"`;
  for (const [key, value] of Object.entries(headers)) {
    command += ` -H "${key}: ${value}"`;
  }
  const stdout = execSync(command, { encoding: 'utf8' });
  return JSON.parse(stdout);
}

const env = loadEnv();
const data = curl('https://api.raindrop.io/rest/v1/raindrops/0?perpage=1', { 'Authorization': `Bearer ${env.RAINDROP_API_KEY}` });
console.log('Raindrop Response:', JSON.stringify(data, null, 2));
