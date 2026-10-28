// Architecture boundaries — the enforced form of the feature-based architecture
// (expo-playbook ch. 03). Run by `npm run check:arch` with --max-warnings=0.
//
// Dependencies flow downward only:  app → shell → features → shared → core (+ domain, db)
// A feature reaches its own internals freely and another feature ONLY through its index.ts.
// `shell` never reaches a feature. `domain` imports nothing but itself.
//
// A boundary suppressed with an inline eslint-disable is not a boundary: an exception
// belongs HERE, where it is reviewable. After editing this file, add a deliberate
// violation, confirm it is reported, then revert — an unknown element is exempt from
// every policy, so a typo makes the gate inert rather than failing.
//
// Syntax: eslint-plugin-boundaries v7. Remove the `domain` / `db` elements if the app has
// no such layers.

const boundaries = require("eslint-plugin-boundaries");
// Reuse the eslint-plugin-import that eslint-config-expo already ships.
const importPlugin = require(
	require.resolve("eslint-plugin-import", {
		paths: [require.resolve("eslint-config-expo/package.json")],
	}),
);
const tsParser = require("@typescript-eslint/parser");

/** Layers every element may always reach. */
const FOUNDATION = ["shared", "core", "domain", "db", "ambient"];

module.exports = [
	{
		files: ["src/**/*.{ts,tsx}"],
		languageOptions: {
			parser: tsParser,
			parserOptions: { ecmaFeatures: { jsx: true } },
		},
		plugins: { boundaries, import: importPlugin },
		settings: {
			"import/parsers": { "@typescript-eslint/parser": [".ts", ".tsx"] },
			"import/resolver": { typescript: { project: "./tsconfig.json" } },
			"boundaries/include": ["src/**/*"],
			"boundaries/elements": [
				// Order matters: the first matching pattern wins.
				{ type: "app", pattern: "src/app/**/*", mode: "full" },
				{ type: "shell", pattern: "src/shell/**/*", mode: "full" },
				{ type: "feature", pattern: "src/features/*/**/*", capture: ["featureName"], mode: "full" },
				{ type: "shared", pattern: "src/shared/**/*", mode: "full" },
				{ type: "core", pattern: "src/core/**/*", mode: "full" },
				{ type: "domain", pattern: "src/domain/**/*", mode: "full" },
				{ type: "db", pattern: "src/db/**/*", mode: "full" },
				{ type: "ambient", pattern: "src/types/**/*", mode: "full" },
			],
		},
		rules: {
			// Two features importing each other's barrels pass the boundary rules and still form a
			// require cycle. What both need belongs in shared.
			"import/no-cycle": ["error", { ignoreExternal: true }],
			"boundaries/no-unknown-files": "error",
			"boundaries/no-unknown-dependencies": "error",
			"boundaries/dependencies": [
				"error",
				{
					default: "disallow",
					policies: [
						// app: routes compose shell, foundation, and feature barrels
						{
							from: { element: { type: "app" } },
							allow: { to: { element: { types: { anyOf: ["app", "shell", ...FOUNDATION] } } } },
						},
						{
							from: { element: { type: "app" } },
							allow: { to: { element: { type: "feature", internalPath: "index.ts" } } },
						},
						// shell: never a feature
						{
							from: { element: { type: "shell" } },
							allow: { to: { element: { types: { anyOf: ["shell", ...FOUNDATION] } } } },
						},
						// features: own internals freely, other features through their barrel
						{
							from: { element: { type: "feature" } },
							allow: {
								to: { element: { type: "feature", captured: { featureName: "{{from.featureName}}" } } },
							},
						},
						{
							from: { element: { type: "feature" } },
							allow: { to: { element: { type: "feature", internalPath: "index.ts" } } },
						},
						{
							from: { element: { type: "feature" } },
							allow: { to: { element: { types: { anyOf: FOUNDATION } } } },
						},
						// Documented exceptions go here, one policy each, with a comment saying why.
						// e.g. a pure schema imported by path in tests:
						// { from: { element: { type: "feature", captured: { featureName: "checkout" } } },
						//   allow: { to: { element: { type: "feature", captured: { featureName: "cart" }, internalPath: "schema.ts" } } } },

						// shared: foundation only
						{
							from: { element: { type: "shared" } },
							allow: { to: { element: { types: { anyOf: FOUNDATION } } } },
						},
						// core / db: nothing above them
						{
							from: { element: { type: "core" } },
							allow: { to: { element: { types: { anyOf: ["core", "ambient"] } } } },
						},
						{
							from: { element: { type: "db" } },
							allow: { to: { element: { types: { anyOf: ["db", "core", "domain", "ambient"] } } } },
						},
						// domain: pure, imports only itself
						{
							from: { element: { type: "domain" } },
							allow: { to: { element: { types: { anyOf: ["domain", "ambient"] } } } },
						},
						{
							from: { element: { type: "ambient" } },
							allow: { to: { element: { type: "ambient" } } },
						},
					],
				},
			],
		},
	},
];
