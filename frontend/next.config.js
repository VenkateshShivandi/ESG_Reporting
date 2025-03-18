/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  
  // Improve build output
  poweredByHeader: false,
  
  // Configure webpack
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Increase chunk loading timeout to 60 seconds (60000ms)
      config.watchOptions = {
        ...config.watchOptions,
        aggregateTimeout: 300,
        poll: 1000,
      };
      
      // Increase chunk loading timeout
      config.output.chunkLoadTimeout = 120000; // 2 minutes
      
      // Optimize chunks with a safer configuration
      config.optimization.splitChunks = {
        chunks: 'all',
        maxInitialRequests: 25,
        minSize: 20000,
        cacheGroups: {
          default: false,
          vendors: false,
          // Main chunk, containing most dependencies
          commons: {
            name: 'commons',
            chunks: 'all',
            minChunks: 2,
            reuseExistingChunk: true,
          },
          // Only for larger libraries - with fixed name function
          lib: {
            test: /[\\/]node_modules[\\/]/,
            name(module) {
              // Safer version that handles potential null matches
              const packageNameMatch = module.context ? 
                module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/) : null;
              
              if (!packageNameMatch) {
                return 'npm.unknown';
              }
              
              const packageName = packageNameMatch[1];
              return `npm.${packageName.replace('@', '')}`;
            },
            priority: 10,
            minChunks: 1,
            reuseExistingChunk: true,
          },
        },
      };
    }
    return config;
  },
  
  // Transpile specified modules
  transpilePackages: [
    '@supabase/supabase-js',
    '@hookform/resolvers',
  ],
}

module.exports = nextConfig 