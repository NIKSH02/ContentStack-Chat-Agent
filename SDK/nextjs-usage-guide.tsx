// // ✅ FIXED VERSION - Next.js Usage Guide
// // Copy this to your Next.js page.tsx or component

// 'use client'; // Add this for Next.js 13+ App Router

// import dynamic from 'next/dynamic';
// import 'contentstack-chat-widget-sdk/style.css';

// // ✅ METHOD 1: Dynamic import (Recommended)
// // This prevents SSR issues and "document is not defined" errors
// const ChatWidget = dynamic(
//   () => import('contentstack-chat-widget-sdk').then((mod) => ({ default: mod.ChatWidget })),
//   { 
//     ssr: false, // ✅ This fixes "document is not defined"
//     loading: () => <div></div> // Optional loading component
//   }
// );

// export default function HomePage() {
//   return (
//     <div className="min-h-screen">
//       <h1>My Next.js Website</h1>
//       <p>Your regular content here...</p>
      
//       {/* ✅ FIXED: Widget now stays fixed during scroll and positions correctly */}
//       <ChatWidget
//         tenantId="your-tenant-id"
//         apiKey="blt483a005c4ad32b09"
//         provider="gemini"
//         model="gemini-2.5-flash"
//         position="bottom-right" // ✅ Now works correctly - stays bottom-right
//         chatTitle="ContentStack Assistant" 
//         placeholder="Ask me about this website..."
//         welcomeMessage="Hi! I'm your ContentStack assistant. What would you like to know?"
//         theme={{
//           primaryColor: '#6a5ddf',
//           secondaryColor: '#f3f4f6',
//           backgroundColor: '#ffffff',
//           textColor: '#1f2937',
//           borderRadius: '12px',
//         }}
//         typingSpeed={15}
//       />
//     </div>
//   );
// }

// // ✅ METHOD 2: Alternative approach using useEffect (if dynamic import doesn't work)
// /*
// import { useEffect, useState } from 'react';
// import 'contentstack-chat-widget-sdk/style.css';

// export default function HomePage() {
//   const [ChatWidget, setChatWidget] = useState<any>(null);

//   useEffect(() => {
//     // Import only on client side
//     import('contentstack-chat-widget-sdk').then((mod) => {
//       setChatWidget(() => mod.ChatWidget);
//     });
//   }, []);

//   return (
//     <div className="min-h-screen">
//       <h1>My Next.js Website</h1>
      
//       {ChatWidget && (
//         <ChatWidget
//           tenantId="your-tenant-id"
//           apiKey="blt483a005c4ad32b09"
//           position="bottom-right"
//           // ... other props
//         />
//       )}
//     </div>
//   );
// }
// */

// // ✅ FIXES IN VERSION 1.0.6:
// // 1. ✅ Fixed "document is not defined" with client-only rendering
// // 2. ✅ Fixed positioning - widget now stays fixed during scroll
// // 3. ✅ Fixed bottom-right position (was showing as bottom-left)
// // 4. ✅ Added proper z-index to prevent overlap issues
// // 5. ✅ Better CSS isolation to prevent conflicts with host site
// // 6. ✅ Fixed React Hooks order error - all hooks now called consistently