/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Add any custom theme extensions if needed
    },
  },
  plugins: [],
  // Ensure all used classes are included
  safelist: [
    // Common positioning classes
    'fixed', 'absolute', 'relative',
    'top-5', 'bottom-5', 'left-2', 'left-4', 'right-2', 'right-4',
    'inset-x-4', 'inset-x-auto',
    // Z-index
    'z-50',
    // Sizing
    'w-auto', 'w-96', 'h-[70vh]', 'h-[500px]',
    'max-w-sm', 'max-w-none',
    // Flexbox
    'flex', 'flex-col', 'items-center', 'justify-between', 'justify-center',
    // Spacing
    'space-x-3', 'px-4', 'py-3', 'p-4', 'p-3', 'mb-4',
    // Typography
    'text-white', 'text-sm', 'text-xs', 'font-bold', 'font-medium',
    // Colors and opacity
    'opacity-100', 'opacity-0', 'opacity-60',
    // Transforms and transitions
    'scale-100', 'scale-95', 'translate-y-0', 'translate-y-4',
    'transition-all', 'duration-300', 'ease-in-out', 'transform',
    // Border and shadow
    'rounded-full', 'rounded-md', 'shadow-2xl', 'border',
    // Overflow
    'overflow-hidden', 'overflow-y-auto',
    // Responsive prefixes
    'sm:absolute', 'sm:bottom-16', 'sm:right-16', 'sm:inset-x-auto',
    'sm:w-96', 'sm:h-[500px]', 'sm:max-w-none', 'sm:left-4', 'sm:right-4',
    // Interactive states
    'hover:bg-gray-100', 'focus:outline-none', 'disabled:opacity-50',
    // Grid and layout
    'pointer-events-none'
  ]
}