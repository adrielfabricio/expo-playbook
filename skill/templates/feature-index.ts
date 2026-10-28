/**
 * Public API of the <feature> feature — expo-playbook ch. 03.
 *
 * Only these symbols may be imported from outside the feature. Each one is a deliberate widening of
 * coupling, so each carries the reason it is public. Never `export *`. Inside the feature, import
 * siblings by relative path, never through this file.
 */

/** Rendered by app/<route>.tsx. */
export { default as ExampleListScreen } from "./screens/example-list";

/** Rendered by app/<route>/[id].tsx. */
export { default as ExampleDetailScreen } from "./screens/example-detail";

/** <other-feature> shows the summary on its dashboard. */
export { useExampleSummary } from "./hooks/use-example-summary";

/** Domain type consumed by <other-feature>'s card. */
export type { Example } from "./types";
