// 🔍 DEBUGGING VERSION - Use this to test if widget loads at all
"use client";

import { useEffect, useState } from 'react';
import 'contentstack-chat-widget-sdk/style.css';

export default function TestPage() {
  const [ChatWidget, setChatWidget] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔍 Starting ChatWidget import...');
    
    import('contentstack-chat-widget-sdk')
      .then((mod) => {
        console.log('✅ ChatWidget import successful:', mod);
        setChatWidget(() => mod.ChatWidget);
        setLoading(false);
      })
      .catch((err) => {
        console.error('❌ ChatWidget import failed:', err);
        setError(`Import failed: ${err.message}`);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ minHeight: '100vh', padding: '20px' }}>
      <h1>ChatWidget Debug Page</h1>
      
      {loading && <p>Loading ChatWidget...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      
      {ChatWidget && (
        <>
          <p style={{ color: 'green' }}>✅ ChatWidget loaded successfully!</p>
          <p>You should see a chat bubble in the bottom-right corner.</p>
          
          <ChatWidget
            tenantId="test-tenant"
            apiKey="blt483a005c4ad32b09"
            provider="groq"
            model="llama-3.1-8b-instant"
            welcomeMessage="Debug test - can you see me?"
            chatTitle="Debug Chat"
            position="bottom-right"
          />
        </>
      )}
      
      {!loading && !ChatWidget && !error && (
        <p style={{ color: 'orange' }}>⚠️ ChatWidget failed to load (no error thrown)</p>
      )}
      
      {/* Add some content to scroll */}
      <div style={{ height: '200vh', background: 'linear-gradient(to bottom, #f0f0f0, #e0e0e0)' }}>
        <h2>Scroll down to test positioning</h2>
        <p>The chat bubble should stay fixed in bottom-right corner while scrolling.</p>
      </div>
    </div>
  );
}