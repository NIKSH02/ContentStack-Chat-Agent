# ContentStack OAuth Integration Documentation

## Overview

The ContentStack OAuth integration enables developers to connect their ContentStack projects to the Chat Agent Platform using **User Tokens** with OAuth 2.0. This allows AI agents to access and query ContentStack content directly through OAuth tokens without storing sensitive API keys.

## OAuth Token Strategy

### User Token vs App Token

We use **User Token** approach because:
- ✅ **User Token**: Acts on behalf of the authenticated user, accessing stacks the user has permissions to
- ❌ **App Token**: Would require explicit installation per stack and acts on behalf of the app

### Required OAuth Scopes

```
cm:stacks:read - Read access to stacks and content
cm:stack:management:read - View single stack details
```

### Why No API Key Storage Needed

Since OAuth tokens provide full access, we don't need to store:
- ❌ Stack API keys (except for Content Delivery API identification)
- ❌ Delivery tokens 
- ❌ CDA API keys

The OAuth access token handles all authentication with ContentStack's Management API.

## Architecture

### Components
1. **OAuth Service** (`/src/services/contentstackOAuth.ts`) - Handles OAuth flow
2. **OAuth Controller** (`/src/controllers/oauthController.ts`) - API endpoints
3. **OAuth Routes** (`/src/routes/oauth.ts`) - Route definitions
4. **Content Service** (`/src/services/contentstackContent.ts`) - Content fetching

### Flow Diagram
```
Developer → Frontend → OAuth Initiate → ContentStack → Callback → Token Exchange → Tenant Connection
```

## API Endpoints

### 1. Initiate OAuth Flow
**GET** `/api/oauth/contentstack/initiate`

Initiates the OAuth flow by generating a ContentStack authorization URL.

**Response:**
```json
{
  "success": true,
  "authUrl": "https://app.contentstack.com/#!/apps/install?client_id=...",
  "state": "base64-encoded-state",
  "message": "Redirect user to this URL to authorize ContentStack access"
}
```

### 2. Handle OAuth Callback
**GET** `/api/oauth/contentstack/callback?code=AUTH_CODE&state=STATE`

Handles the OAuth callback from ContentStack after user authorization.

**Parameters:**
- `code` - Authorization code from ContentStack
- `state` - CSRF protection state (optional)

**Response:**
```json
{
  "success": true,
  "message": "OAuth authorization successful",
  "data": {
    "user": {
      "uid": "user_uid",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "organizations": [...]
    },
    "projects": [...],
    "tokenInfo": {
      "access_token": "access_token",
      "expires_in": 3600,
      "scope": "cm:stacks:read cm:stacks:write"
    }
  }
}
```

### 3. Get User Projects
**GET** `/api/oauth/contentstack/projects?access_token=ACCESS_TOKEN`

Retrieves the user's ContentStack projects and stacks.

**Parameters:**
- `access_token` - Valid ContentStack access token

**Response:**
```json
{
  "success": true,
  "message": "Projects retrieved successfully",
  "data": {
    "projects": [
      {
        "uid": "org_uid",
        "name": "Organization Name",
        "stacks": [
          {
            "uid": "stack_uid",
            "name": "Stack Name",
            "api_key": "stack_api_key",
            "master_locale": "en-us"
          }
        ]
      }
    ]
  }
}
```

### 4. Get Stack Delivery Tokens
**GET** `/api/oauth/contentstack/stacks/:stackApiKey/tokens?access_token=ACCESS_TOKEN`

Retrieves delivery tokens for a specific stack.

**Parameters:**
- `stackApiKey` - Stack API key
- `access_token` - Valid ContentStack access token

**Response:**
```json
{
  "success": true,
  "message": "Delivery tokens retrieved successfully",
  "data": {
    "stackApiKey": "stack_api_key",
    "deliveryTokens": [
      {
        "token": "delivery_token",
        "name": "Production Token",
        "environment": "production"
      }
    ]
  }
}
```

### 5. Connect ContentStack to Tenant
**POST** `/api/oauth/contentstack/connect/:tenantId`

Connects a ContentStack project to an existing tenant.

**Headers:**
- `Authorization: Bearer JWT_TOKEN`

**Body:**
```json
{
  "access_token": "contentstack_oauth_access_token",
  "refresh_token": "contentstack_refresh_token",
  "organizationUid": "organization_uid",
  "stackUid": "stack_uid", 
  "stackApiKey": "stack_api_key",
  "environment": "production",
  "region": "EU",
  "expires_in": 3600
}
```

**Response:**
```json
{
  "success": true,
  "message": "ContentStack successfully connected to tenant",
  "data": {
    "tenantId": "tenant_id",
    "contentstack": {
      "organizationUid": "organization_uid",
      "stackUid": "stack_uid",
      "region": "EU",
      "environment": "production",
      "tokenExpiry": "2025-09-10T15:30:00.000Z"
    }
  }
}
```

### 6. Get Connection Status
**GET** `/api/oauth/contentstack/status/:tenantId`

Checks if a tenant is connected to ContentStack.

**Headers:**
- `Authorization: Bearer JWT_TOKEN`

**Response:**
```json
{
  "success": true,
  "data": {
    "tenantId": "tenant_id",
    "isConnected": true,
    "contentstack": {
      "organizationUid": "organization_uid",
      "stackUid": "stack_uid", 
      "region": "EU",
      "environment": "production",
      "tokenExpiry": "2025-09-10T15:30:00.000Z"
    }
  }
}
```

### 7. Disconnect ContentStack
**DELETE** `/api/oauth/contentstack/disconnect/:tenantId`

Disconnects ContentStack from a tenant.

**Headers:**
- `Authorization: Bearer JWT_TOKEN`

**Response:**
```json
{
  "success": true,
  "message": "ContentStack successfully disconnected from tenant",
  "data": {
    "tenantId": "tenant_id"
  }
}
```

### 8. Refresh Access Token
**POST** `/api/oauth/contentstack/refresh`

Refreshes an expired ContentStack access token.

**Body:**
```json
{
  "refresh_token": "refresh_token"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Access token refreshed successfully",
  "data": {
    "access_token": "new_access_token",
    "expires_in": 3600,
    "scope": "cm:stacks:read cm:stacks:write"
  }
}
```

## Environment Configuration

Add the following to your `.env` file:

```bash
# ContentStack OAuth App Configuration
CONTENTSTACK_CLIENT_ID=your_contentstack_oauth_client_id
CONTENTSTACK_CLIENT_SECRET=your_contentstack_oauth_client_secret
CONTENTSTACK_REDIRECT_URI=http://localhost:3001/api/oauth/contentstack/callback

# ContentStack App/Management API Base URL
CONTENTSTACK_BASE_URL=https://app.contentstack.com

# Default ContentStack Region
CONTENTSTACK_DEFAULT_REGION=EU
```

## OAuth App Setup in ContentStack

1. Go to [ContentStack Developer Hub](https://app.contentstack.com/#!/apps/manage)
2. Click "Create App" or "Register App"
3. Fill in app details:
   - **App Name**: Chat Agent Platform
   - **Description**: AI-powered chat agent with ContentStack integration
   - **App URL**: Your frontend URL
   - **Redirect URI**: `http://localhost:3001/api/oauth/contentstack/callback`
4. Select required scopes:
   - `cm:stacks:read` - Read access to stacks and content
   - `cm:stack:management:read` - View single stack details
5. Save and copy the Client ID and Client Secret

## Usage in Frontend

### Step 1: Initiate OAuth
```javascript
const response = await fetch('/api/oauth/contentstack/initiate');
const { authUrl } = await response.json();

// Redirect user to authUrl
window.location.href = authUrl;
```

### Step 2: Handle Callback (in your callback page)
```javascript
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');
const state = urlParams.get('state');

if (code) {
  const response = await fetch(`/api/oauth/contentstack/callback?code=${code}&state=${state}`);
  const data = await response.json();
  
  if (data.success) {
    // Store access token and show projects
    localStorage.setItem('contentstack_token', data.data.tokenInfo.access_token);
    showProjects(data.data.projects);
  }
}
```

### Step 3: Connect to Tenant
```javascript
const connectTenant = async (tenantId, projectData) => {
  const response = await fetch(`/api/oauth/contentstack/connect/${tenantId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwtToken}`
    },
    body: JSON.stringify({
      access_token: localStorage.getItem('contentstack_token'),
      refresh_token: localStorage.getItem('contentstack_refresh_token'),
      organizationUid: projectData.organizationUid,
      stackUid: projectData.stackUid,
      stackApiKey: projectData.stackApiKey,
      environment: 'production',
      region: 'EU',
      expires_in: 3600
    })
  });
  
  const result = await response.json();
  return result;
};
```

## Security Considerations

1. **CSRF Protection**: State parameter is used for CSRF protection
2. **Token Storage**: Access tokens are not stored server-side for security
3. **Scope Limitation**: Only request necessary scopes
4. **Token Expiry**: Implement token refresh mechanism
5. **Validation**: All tokens are validated before use

## Error Handling

Common error scenarios:

1. **Invalid Authorization Code**: Returns 500 with message about token exchange failure
2. **Expired Access Token**: Returns 401 with "Invalid or expired access token"
3. **Insufficient Permissions**: Returns 400 with stack access verification failure
4. **Tenant Not Found**: Returns 404 with "Tenant not found"
5. **Access Denied**: Returns 403 for non-owner tenant access attempts

## Next Steps

1. **Phase 3**: Implement MCP server integration for content fetching
2. **Phase 4**: Create React SDK with ContentStack-powered chat components
3. **Phase 5**: Add real-time content syncing and caching

## ContentStack Content Service

The `ContentStackService` class provides methods to:

- Fetch content types and entries
- Search across content
- Get content summaries for AI context
- Test connections

This service will be used by the MCP server to provide content context to the LLM.
