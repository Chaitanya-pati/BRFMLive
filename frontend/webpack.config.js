const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function(env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  config.devServer = {
    ...config.devServer,
    host: '0.0.0.0',
    port: 5000,
    allowedHosts: 'all',
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
        // Remove /api prefix when forwarding to backend since backend expects /login
        pathRewrite: { '^/api': '' },
      },
    },
  };

  return config;
};