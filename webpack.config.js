const path = require('path');
const nodeExternals = require('webpack-node-externals');
const { TsconfigPathsPlugin } = require('tsconfig-paths-webpack-plugin');

module.exports = function (options, webpack) {
  return {
    ...options,
    entry: './src/main.ts',
    externals: [
      nodeExternals({
        allowlist: ['tsconfig-paths'],
      }),
    ],
    output: {
      ...options.output,
      libraryTarget: 'commonjs2',
    },
    resolve: {
      ...options.resolve,
      extensions: ['.ts', '.js', '.json'],
      plugins: [
        ...(options.resolve?.plugins || []),
        new TsconfigPathsPlugin({
          configFile: './tsconfig.json',
        }),
      ],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@/shared': path.resolve(__dirname, 'src/shared'),
        '@/modules': path.resolve(__dirname, 'src/modules'),
      },
    },
    module: {
      ...options.module,
      rules: [
        ...options.module.rules,
        {
          test: /\.ts$/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                transpileOnly: true,
                configFile: 'tsconfig.json',
              },
            },
          ],
          exclude: /node_modules/,
        },
      ],
    },
    optimization: {
      ...options.optimization,
      minimize: false,
      nodeEnv: false,
    },
    node: {
      __dirname: false,
      __filename: false,
    },
    plugins: [
      ...options.plugins,
      new webpack.IgnorePlugin({
        checkResource(resource) {
          const lazyImports = [
            '@nestjs/microservices',
            '@nestjs/microservices/microservices-module',
            '@nestjs/websockets/socket-module',
            'cache-manager',
            'class-validator',
            'class-transformer',
          ];
          if (!lazyImports.includes(resource)) {
            return false;
          }
          try {
            require.resolve(resource);
          } catch (err) {
            return true;
          }
          return false;
        },
      }),
    ],
  };
};
