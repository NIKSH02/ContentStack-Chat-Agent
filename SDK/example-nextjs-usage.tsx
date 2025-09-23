// // ✅ FIXED VERSION - Next.js Usage Guide
// Copy this to your Next.js page.tsx or component
// 'use client'; // Add this for Next.js 13+ App Router

// import dynamic from 'next/dynamic';
// import 'contentstack-chat-widget-sdk/style.css';

// // Dynamic import to prevent SSR issues
// const ChatWidget = dynamic(
//   () => import('contentstack-chat-widget-sdk').then((mod) => ({ default: mod.ChatWidget })),
//   { 
//     ssr: false, // Disable server-side rendering for this component
//     loading: () => <div></div> // Optional loading component
//   }
// );

// export default function HomePage() {
//   return (
//     <div className="min-h-screen">
//       <h1>My Next.js Website</h1>
      
//       <ChatWidget
//         tenantId="your-tenant-id"
//         apiKey="blt483a005c4ad32b09"
//         provider="gemini"
//         model="gemini-2.5-flash"
//         position="bottom-right"
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