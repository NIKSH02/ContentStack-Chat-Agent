// Test different OAuth URL configurations
const { URLSearchParams } = require('url');

const clientId = 'V3xOkX8gfTXQRbJG';
const appId = '68c15c824f8023001243f1fb';
const baseUrl = 'https://eu-app.contentstack.com';

const redirectUris = [
  'http://localhost:3000/oauth/callback',
  'http://127.0.0.1:3000/oauth/callback', 
  'https://localhost:3000/oauth/callback',
  'http://localhost:3000/oauth/contentstack/callback'
];

console.log('=== ContentStack OAuth URL Test ===\n');

redirectUris.forEach((redirectUri, index) => {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'cm:stacks:read cm:stack:management:read',
    state: 'test-state-123'
  });

  const authUrl = `${baseUrl}/#!/apps/${appId}/authorize?${params.toString()}`;
  
  console.log(`${index + 1}. Redirect URI: ${redirectUri}`);
  console.log(`   OAuth URL: ${authUrl}`);
  console.log('');
});

console.log('Try each URL in your browser and see which one works with your ContentStack app configuration.');
