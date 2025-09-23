import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export const OAuthCallback = () => {
  const location = useLocation();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing OAuth callback...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        const error_description = urlParams.get('error_description');
        const state = urlParams.get('state');

        console.log('🔄 OAuth Callback received:', {
          code: code ? 'present' : 'missing',
          error,
          error_description,
          state
        });

        if (error) {
          console.error('❌ OAuth Error:', error, error_description);
          setStatus('error');
          setMessage(`OAuth Error: ${error} - ${error_description || 'Unknown error'}`);
          
          // Send error message to parent window
          window.opener?.postMessage({
            type: 'OAUTH_ERROR',
            error: `${error}: ${error_description || 'OAuth authorization failed'}`,
            state: state
          }, window.location.origin);
          
          setTimeout(() => window.close(), 2000);
          return;
        }

        if (!code) {
          console.error('❌ No authorization code received');
          setStatus('error');
          setMessage('No authorization code received');
          
          window.opener?.postMessage({
            type: 'OAUTH_ERROR',
            error: 'No authorization code received',
            state: state
          }, window.location.origin);
          
          setTimeout(() => window.close(), 2000);
          return;
        }

        console.log('🔄 Exchanging code for tokens...');
        setMessage('Exchanging authorization code for tokens...');

        // Call the backend callback endpoint
        const callbackUrl = `http://localhost:5002/api/oauth/contentstack/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state || '')}`;
        console.log('📡 Calling callback URL:', callbackUrl);
        
        const response = await fetch(callbackUrl);
        const sessionData = await response.json();
        
        console.log('📋 Backend callback response:', sessionData);

        if (sessionData.success) {
          console.log('✅ OAuth Flow Complete - Session Data:', JSON.stringify(sessionData.data, null, 2));
          
          setStatus('success');
          setMessage('OAuth successful! Closing window...');
          
          // Send success message with complete session data to parent window
          window.opener?.postMessage({
            type: 'OAUTH_SUCCESS',
            code: code,
            state: state,
            sessionData: sessionData.data
          }, window.location.origin);
          
          setTimeout(() => window.close(), 1500);
          
        } else {
          throw new Error(sessionData.message || 'OAuth callback failed');
        }

      } catch (error: any) {
        console.error('❌ OAuth Callback Error:', error);
        setStatus('error');
        setMessage(`OAuth failed: ${error.message}`);
        
        window.opener?.postMessage({
          type: 'OAUTH_ERROR',
          error: error.message || 'OAuth callback processing failed'
        }, window.location.origin);
        
        setTimeout(() => window.close(), 3000);
      }
    };

    handleCallback();
  }, [location]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
            status === 'success' ? 'bg-green-100' : 
            status === 'error' ? 'bg-red-100' : 'bg-blue-100'
          }`}>
            {status === 'processing' && (
              <div className="animate-spin w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full"></div>
            )}
            {status === 'success' && (
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {status === 'error' && (
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          
          <h1 className={`text-2xl font-bold mb-2 ${
            status === 'success' ? 'text-green-900' : 
            status === 'error' ? 'text-red-900' : 'text-gray-900'
          }`}>
            {status === 'processing' && 'Processing OAuth'}
            {status === 'success' && 'OAuth Successful!'}
            {status === 'error' && 'OAuth Failed'}
          </h1>
          
          <p className="text-gray-600 mb-6">
            {message}
          </p>
          
          <div className={`border rounded-lg p-4 ${
            status === 'success' ? 'bg-green-50 border-green-200' : 
            status === 'error' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
          }`}>
            <p className={`text-sm ${
              status === 'success' ? 'text-green-800' : 
              status === 'error' ? 'text-red-800' : 'text-blue-800'
            }`}>
              {status === 'processing' && 'This window will close automatically once the process is complete.'}
              {status === 'success' && 'Authentication successful! This window will close shortly.'}
              {status === 'error' && 'Please close this window and try again.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};