// import React from 'react';
// import type { LLMProvider, ChatWidgetTheme } from '../types';

// interface ProviderSelectorProps {
//   providers: LLMProvider[];
//   selectedProvider: string;
//   selectedModel: string;
//   onProviderChange: (providerId: string, modelId?: string) => void;
//   theme: ChatWidgetTheme;
// }

// export const ProviderSelector: React.FC<ProviderSelectorProps> = ({
//   providers,
//   selectedProvider,
//   selectedModel,
//   onProviderChange
// }) => {
//   const currentProvider = providers.find(p => p.id === selectedProvider);

//   return (
//     <div className="p-4 bg-white border-b border-gray-100">
//       <div className="space-y-3">
//         <div>
//           <label className="block text-xs font-medium text-gray-700 mb-1">
//             AI Provider
//           </label>
//           <select
//             value={selectedProvider}
//             onChange={(e) => onProviderChange(e.target.value)}
//             className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
//           >
//             {providers.map(provider => (
//               <option key={provider.id} value={provider.id}>
//                 {provider.name}
//               </option>
//             ))}
//           </select>
//         </div>

//         {currentProvider && currentProvider.models.length > 1 && (
//           <div>
//             <label className="block text-xs font-medium text-gray-700 mb-1">
//               Model
//             </label>
//             <select
//               value={selectedModel}
//               onChange={(e) => onProviderChange(selectedProvider, e.target.value)}
//               className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
//             >
//               {currentProvider.models.map(model => (
//                 <option key={model} value={model}>
//                   {model}
//                 </option>
//               ))}
//             </select>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };