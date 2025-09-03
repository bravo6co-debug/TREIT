
  import { defineConfig } from 'vite';
  import react from '@vitejs/plugin-react-swc';
  import path from 'path';

  export default defineConfig({
    plugins: [react()],
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      alias: {
        'vaul@1.1.2': 'vaul',
        'sonner@2.0.3': 'sonner',
        'recharts@2.15.2': 'recharts',
        'react-resizable-panels@2.1.7': 'react-resizable-panels',
        'react-hook-form@7.55.0': 'react-hook-form',
        'react-day-picker@8.10.1': 'react-day-picker',
        'next-themes@0.4.6': 'next-themes',
        'lucide-react@0.487.0': 'lucide-react',
        'input-otp@1.4.2': 'input-otp',
        'figma:asset/4d914e156bb643f84e4345ddcffa6614b97a1685.png': path.resolve(__dirname, './src/assets/4d914e156bb643f84e4345ddcffa6614b97a1685.png'),
        'embla-carousel-react@8.6.0': 'embla-carousel-react',
        'cmdk@1.1.1': 'cmdk',
        'class-variance-authority@0.7.1': 'class-variance-authority',
        '@radix-ui/react-tooltip': '@radix-ui/react-tooltip',
        '@radix-ui/react-toggle': '@radix-ui/react-toggle',
        '@radix-ui/react-toggle-group': '@radix-ui/react-toggle-group',
        '@radix-ui/react-tabs': '@radix-ui/react-tabs',
        '@radix-ui/react-switch': '@radix-ui/react-switch',
        '@radix-ui/react-slot': '@radix-ui/react-slot',
        '@radix-ui/react-slider': '@radix-ui/react-slider',
        '@radix-ui/react-separator': '@radix-ui/react-separator',
        '@radix-ui/react-select': '@radix-ui/react-select',
        '@radix-ui/react-scroll-area': '@radix-ui/react-scroll-area',
        '@radix-ui/react-radio-group': '@radix-ui/react-radio-group',
        '@radix-ui/react-progress': '@radix-ui/react-progress',
        '@radix-ui/react-popover': '@radix-ui/react-popover',
        '@radix-ui/react-navigation-menu': '@radix-ui/react-navigation-menu',
        '@radix-ui/react-menubar': '@radix-ui/react-menubar',
        '@radix-ui/react-label': '@radix-ui/react-label',
        '@radix-ui/react-hover-card': '@radix-ui/react-hover-card',
        '@radix-ui/react-dropdown-menu': '@radix-ui/react-dropdown-menu',
        '@radix-ui/react-dialog': '@radix-ui/react-dialog',
        '@radix-ui/react-context-menu': '@radix-ui/react-context-menu',
        '@radix-ui/react-collapsible': '@radix-ui/react-collapsible',
        '@radix-ui/react-checkbox': '@radix-ui/react-checkbox',
        '@radix-ui/react-avatar': '@radix-ui/react-avatar',
        '@radix-ui/react-aspect-ratio': '@radix-ui/react-aspect-ratio',
        '@radix-ui/react-alert-dialog': '@radix-ui/react-alert-dialog',
        '@radix-ui/react-accordion': '@radix-ui/react-accordion',
        '@': path.resolve(__dirname, './src'),
        '@shared': path.resolve(__dirname, '../shared'),
      },
    },
    build: {
      target: 'esnext',
      outDir: 'build',
      // Bundle optimization
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor chunk for React and related libraries
            vendor: ['react', 'react-dom', 'react-router-dom'],
            
            // UI components chunk
            ui: [
              '@radix-ui/react-accordion',
              '@radix-ui/react-alert-dialog',
              '@radix-ui/react-avatar',
              '@radix-ui/react-checkbox',
              '@radix-ui/react-dialog',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-label',
              '@radix-ui/react-popover',
              '@radix-ui/react-select',
              '@radix-ui/react-separator',
              '@radix-ui/react-switch',
              '@radix-ui/react-tabs',
              '@radix-ui/react-tooltip'
            ],
            
            // Charts and visualization
            charts: ['recharts'],
            
            // Form handling
            forms: ['react-hook-form'],
            
            // State management
            state: ['zustand'],
            
            // Supabase and API
            supabase: ['@supabase/supabase-js'],
            
            // Icons
            icons: ['lucide-react'],
            
            // Utilities
            utils: ['clsx', 'class-variance-authority', 'tailwind-merge']
          }
        }
      },
      // Optimize chunk size
      chunkSizeWarningLimit: 1000,
      
      // Minification options
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
    },
    server: {
      port: 9000,
      strictPort: true, // 포트가 사용 중이면 에러 발생, 다른 포트로 변경하지 않음
      open: true,
    },
  });