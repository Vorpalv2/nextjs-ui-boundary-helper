# ui-boundary-helper

A Next.js App Router development tool that automatically annotates Server Components, Client Components, Suspense boundaries, cache directives, and Server Actions with interactive visual overlays.

## Install

```bash
npm install ui-boundary-helper
```

## Wrap the app

Enable automatic annotations in `next.config.ts` with the package's Next.js integration. It installs a source transform for local `.tsx` and `.jsx` files under both Turbopack and webpack:

```ts
import type { NextConfig } from "next";
import { withBoundaryDebug } from "ui-boundary-helper/next";

const nextConfig: NextConfig = {};

export default withBoundaryDebug(nextConfig);
```

Then add the provider once in the root `app/layout.tsx`. The layout remains a Server Component; the provider receives `children` as a slot.

```tsx
import { BoundaryProvider } from "ui-boundary-helper";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <BoundaryProvider debug={process.env.NODE_ENV === "development"}>
          {children}
        </BoundaryProvider>
      </body>
    </html>
  );
}
```

The transform reads local component files and directives as Next.js compiles them, then injects annotations automatically. Hot reload recompiles changed files and refreshes their annotations. Set `debug` to `true` or `false` in the layout to turn annotations on or off. It defaults to enabled in development and disabled in production. The provider adds no layout element, and annotations are drawn in a pointer-transparent overlay. `DebugBoundary` remains available for a manual override when needed:

```tsx
import { DebugBoundary } from "ui-boundary-helper";

<DebugBoundary kind="client" name="HeroBanner.tsx">
  <HeroBanner />
</DebugBoundary>
```

Automatic labels use `boundary type | component-file.tsx`, such as `Client Component | client-counter.tsx` or `Server Component | page.tsx`. A Server Action is labeled `Server Action`. If you manually provide `detail`, it appears as a third field. Client annotations are blue, server annotations are red, cache annotations are green, and Suspense annotations are amber. Nested components receive separate outlines, so a server component containing a client component with a cached server child appears as nested layers. Labels sit above their outlines with visible spacing; the dotted borders and labels overlay the page without changing its layout.

For a region that represents multiple concepts, pass several `kinds`; their labels and outlines stack above and around the same region:

```tsx
<DebugBoundary kinds={["cache", "server"]} name="CachedProductData">
  <ProductData />
</DebugBoundary>
```

`DebugBoundary` can receive Server Component output through `children`. For async server UI, `SuspenseBoundary` pairs a fallback with the resolved slot:

```tsx
import { SuspenseBoundary } from "ui-boundary-helper";

<SuspenseBoundary name="ProductReviews" fallback={<ReviewsSkeleton />}>
  <ProductReviews />
</SuspenseBoundary>
```

The Next integration reads directives during compilation, not by inspecting runtime component objects. It adds a boundary around each detected local component, including the default page export, named component functions, components passed to wrappers such as `memo`, and React class `render` methods. A file with `'use client'` is labeled as a Client Component; files without it are labeled as Server Components by default. Function-level `'use cache'` directives receive cache and server annotations on that component. `<Suspense>` boundaries receive a persistent Suspense annotation, with the wrapped component name available on hover; forms using Server Actions receive annotations as well. A Server Action marked with `'use server'` is a function, not a Server Component. The `server-only` and `client-only` package markers are also supported, but are not directives.

### How cached component inputs work

Next.js uses the cached function or component and its serializable inputs to determine which result can be reused. Pass every value that can change the result into the cached component. A different input combination gets its own cache entry; a later render with the same inputs can reuse that entry while it is valid.

For example, a product variant can be cached by product ID and color:

```tsx
type CachedBagProps = {
  productId: string;
  color: "green" | "blue";
};

async function CachedBag({ productId, color }: CachedBagProps) {
  "use cache";

  const bag = await getBagVariant(productId, color);

  return (
    <article>
      <img src={bag.imageUrl} alt={`${color} ${bag.name}`} />
      <h2>{bag.name}</h2>
      <p>Color: {color}</p>
      <p>{bag.price}</p>
    </article>
  );
}
```

`("bag-123", "green")` and `("bag-123", "blue")` are separate entries. Another request for `("bag-123", "green")` can reuse the green result. Include every result-changing input, such as size or locale, too. If almost every input combination is unique, caching may have few hits. A cached component's rendered markup and image URL may be reused; the image file itself is handled by the browser or image CDN cache separately. Set an appropriate cache lifetime or invalidate entries when product data changes. See [Next.js' `use cache` documentation](https://nextjs.org/docs/app/api-reference/directives/use-cache) for cache keys, serialization, and invalidation.

The React wrapper uses React and React DOM. The optional Next integration uses TypeScript to transform app source files during builds.

## Local example

This repository includes a deliberately small Next.js app under `examples/next-app` to try automatic annotations, the client island, cached server output, Server Actions, and Suspense boundaries.

```bash
pnpm install
pnpm --filter ui-boundary-helper build
pnpm --filter next-app-example dev
```

From the repository root, `npm run dev` starts the same example app.

## Package development

```bash
pnpm build
npm pack
npm publish
```
