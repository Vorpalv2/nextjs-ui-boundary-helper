type NextConfigLike = {
  turbopack?: {
    rules?: Record<string, unknown>;
    [key: string]: unknown;
  };
  webpack?: (config: WebpackConfigLike, context: unknown) => WebpackConfigLike;
  [key: string]: unknown;
};

type WebpackConfigLike = {
  module?: { rules?: unknown[]; [key: string]: unknown };
  [key: string]: unknown;
};

/** Adds the build-time component annotator to Next.js Turbopack and webpack. */
export function withBoundaryDebug<T extends object>(inputConfig: T): T {
  const config = inputConfig as NextConfigLike;
  const loader = require.resolve("../../loaders/boundary-loader.cjs");
  const turbopack = config.turbopack ?? {};
  const rules = turbopack.rules ?? {};
  const loaderRule = {
    condition: { not: "foreign" },
    loaders: [loader],
  };

  const originalWebpack = config.webpack;
  const updated: NextConfigLike = {
    ...config,
    turbopack: {
      ...turbopack,
      rules: {
        ...rules,
        "*.tsx": loaderRule,
        "*.jsx": loaderRule,
      },
    },
    webpack: (webpackConfig, context) => {
      const nextWebpackConfig = originalWebpack
        ? originalWebpack(webpackConfig, context)
        : webpackConfig;
      const moduleConfig = nextWebpackConfig.module ?? {};
      return {
        ...nextWebpackConfig,
        module: {
          ...moduleConfig,
          rules: [
            ...(moduleConfig.rules ?? []),
            {
              test: /\.(tsx|jsx)$/,
              exclude: /(?:node_modules|\.next)/,
              enforce: "pre",
              use: [{ loader }],
            },
          ],
        },
      };
    },
  };
  return updated as T;
}
