# UI Boundary Helper: popup and directive guide

UI Boundary Helper is a development-time visual guide for Next.js App Router projects. It draws overlays around detected component and rendering boundaries, and shows source and runtime details when you hover a boundary label. The overlay is intended to help you see where components sit in the rendered UI; it does not change the page layout.

## Popup fields

The popup fields vary by boundary type. Fields that do not apply to a type are omitted.

| Field | Meaning |
| --- | --- |
| **Name** | The component or file name associated with the boundary. |
| **Function** | The Server Action function name. The popup adds `()` to make clear that this label refers to a function. |
| **Total lines** | Number of lines in the source file containing the component or action. It counts the whole file, not only the function body. |
| **Parameters** | The parameters declared by the component or function. The transform reports the source-level types it can determine; `None` means it found no parameters. |
| **Return type** | The declared return type, or the type TypeScript can infer from the source. It may be unavailable if the transform cannot determine it. |
| **useState used** | For client components, whether the component's source uses the React `useState` hook. |
| **useEffect used** | For client components, whether the component's source uses the React `useEffect` hook. |
| **Async Server Component** | For server component boundaries, whether the component is declared `async` or has top-level `await`. This identifies async server rendering; it does not say whether a request is currently pending. |
| **Using cache directive** | For server component boundaries, whether the component has a recognized cache directive. Cache boundaries also show this field as applicable. |
| **Suspense status** | Whether the browser observed the Suspense fallback (`Waiting`) or the content resolved (`Resolved`). If the fallback was never observed by the client, the popup says so; this does not mean the boundary failed. |
| **Render time** | A measurement associated with the boundary type. See [How to read render time](#how-to-read-render-time). |
| **Width** | The measured rendered width of the component's visible content element, in CSS pixels. |
| **Height** | The measured rendered height of the component's visible content element, in CSS pixels. |
| **Font** | The computed font family of the measured content element. |

### How to read render time

- **Client and Server Components:** measures the component function's execution up to the point where it returns its JSX. Async Server Components include the work they await before returning.
- **Cached components:** shows the time measured while generating the cached result. When Next.js reuses that result, this value can be reused too; it is not the time spent looking up a cache hit.
- **Suspense:** measures the time the browser observed the fallback before the content resolved. If no fallback was observed, there is no client-observed waiting duration to report.
- **Server Actions:** measures the browser-observed time from submitting the action to receiving its completion. This includes the request/response round trip, so it is not server-only function execution time.

These values are useful development estimates, not a complete profile of rendering. They do not measure the full descendant tree, network transfer, or browser paint. Very short durations display as `<0.1 ms` because they are below the display precision.

## Directive and boundary labels

The helper uses different labels to distinguish component environments, cache behavior, and React boundaries. Some are actual JavaScript directives; others describe a boundary or use marker packages.

| Label | What it means |
| --- | --- |
| **Client Component** | A component in a module marked with `'use client'`. This creates a client module boundary: the module and its imports are included in the client bundle and can use client features such as state and effects. |
| **Server Component** | A component rendered on the server. In the Next.js App Router, this is the default when a module does not have `'use client'`. `'use server'` does **not** mark a Server Component. |
| **Server Action** | A server function marked with `'use server'` at the function or module level and exposed for invocation from the client. It is a function boundary, not a Server Component. |
| **use cache** | Next.js caching directive that opts the function or component result into the framework's cache, keyed by its inputs and other cache-key data. It applies to server code, not Client Components. |
| **use cache: private** | A cache directive for request-specific data, using the private cache behavior supported by the Next.js version and configuration. |
| **use cache: remote** | A cache directive that uses the configured remote cache handler supported by the Next.js version and configuration. |
| **Suspense** | A React `<Suspense>` boundary that can show a fallback while its child content is not ready. Suspense is a React component/API, not a Next.js source directive. |
| **Server Only** | The `server-only` marker package is imported to make a module server-only and catch accidental client imports. It is a package marker, not a directive. |
| **Client Only** | The `client-only` marker package is imported to make a module client-only and catch accidental server imports. It is a package marker, not a directive. |

The helper detects these from source during Next.js compilation. Runtime component objects do not reliably reveal whether their source module used a directive. Components without `'use client'` in the App Router are treated as Server Components by default.

## Popup controls

- **Pin:** keeps the popup open when the pointer leaves the label and popup. Click again to unpin.
- **Eye:** toggles the popup between its normal opacity and half opacity.
- **Unavailable help (`?`):** indicates that source metadata could not be read at that moment. Refresh the page; if the value remains unavailable during development, clear the `.next` build cache and restart the dev server so the source transform can rebuild its metadata.

## Development toolbar

The floating UI Boundary toolbar is available when debugging is enabled. It can show or hide annotations, tint component backgrounds, search by component name, filter and tint individual boundary types, and change its theme, screen position, and size. The keyboard shortcut shown in the toolbar toggles boundary annotations without opening the toolbar.
