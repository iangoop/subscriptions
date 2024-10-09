/**
 * craco is being used to customize react app build, as it does not support tsconfig paths ootb
 */
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
module.exports = {
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      webpackConfig.resolve.plugins = [
        ...(webpackConfig.resolve.plugins || []),
        new TsconfigPathsPlugin({
          extensions: webpackConfig.resolve.extensions,
        }),
      ];
      return webpackConfig;
    },
  },
};
