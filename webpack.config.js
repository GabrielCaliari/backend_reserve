const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = function (options, webpack) {
  return {
    ...options,
    externals: [
      nodeExternals({
        allowlist: ['tsconfig-paths'],
      }),
    ],
    resolve: {
      ...options.resolve,
      alias: {
        '@/generated': path.resolve(__dirname, 'prisma/generated'),
        '@/shared': path.resolve(__dirname, 'src/shared'),
        '@/modules': path.resolve(__dirname, 'src/modules'),
        '@': path.resolve(__dirname, 'src'),
      },
    },
  };
};
