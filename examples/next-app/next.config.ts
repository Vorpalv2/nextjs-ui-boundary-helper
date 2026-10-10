import type { NextConfig } from "next";
import { withBoundaryDebug } from "ui-boundary-helper/next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  transpilePackages: ["ui-boundary-helper"],
  agentRules: false,
};

// The integration annotates component, Suspense, and Server Action boundaries.
export default withBoundaryDebug(nextConfig);
