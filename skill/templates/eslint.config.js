// ESLint flat config — expo-playbook canonical (chapter 15).
// Adjust BACKEND_SDK and DATA_ACCESS_FILES to the app's data source (chapter 10).
const expoConfig = require("eslint-config-expo/flat");
const { defineConfig } = require("eslint/config");

/** The backend SDK only the client and the data layer may import. */
const BACKEND_SDK = ["@supabase/supabase-js", "@supabase/supabase-js/*"]; // or "firebase/*", "drizzle-orm/expo-sqlite"

/** Files allowed to import BACKEND_SDK: the client in core/ and the data modules. */
const DATA_ACCESS_FILES = [
	"src/core/supabase/**", // or src/services/firebase/**, src/db/**
	"src/features/*/data/**",
	"src/shared/data/**",
	"src/repositories/**", // layered apps
];

const STYLE_SCALE_KEYS =
	"/^(fontSize|lineHeight|letterSpacing|border(Top|Bottom)?(Left|Right)?Radius|(padding|margin)(Top|Bottom|Left|Right|Horizontal|Vertical)?|gap|rowGap|columnGap)$/";

const DESIGN_TOKEN_SELECTORS = [
	{
		selector: "Literal[value=/^#([0-9a-fA-F]{3,4}){1,2}$/]",
		message: "Raw hex colour — use a colour role from the theme (expo-playbook ch. 08).",
	},
	{
		selector: `Property:matches([key.name=${STYLE_SCALE_KEYS}], [key.value=${STYLE_SCALE_KEYS}])[value.raw=/^[0-9.]/]`,
		message: "Raw style value — use a token from the theme: spacing, radius or typography (ch. 08).",
	},
];

const UTC_DATE_SELECTOR = {
	selector:
		"CallExpression[callee.property.name='slice'][callee.object.callee.property.name='toISOString']",
	message:
		"toISOString().slice(0, 10) reads the date in UTC — use the calendar-date helpers of the dates module (ch. 20).",
};

const NO_ENUM_SELECTOR = {
	selector: "TSEnumDeclaration",
	message: "Use a string union type instead of an enum (expo-playbook ch. 06).",
};

/**
 * App sources that must use tokens. The theme folder (core/theme or global/theme) is not listed,
 * so it is where literals live. Add width|height|top|left|right|bottom to STYLE_SCALE_KEYS for an
 * app that sizes everything from tokens.
 */
const APP_SOURCES = ["src/app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}", "src/shared/ui/**/*.{ts,tsx}", "src/features/**/*.{ts,tsx}", "src/shell/**/*.{ts,tsx}"];

module.exports = defineConfig([
	expoConfig,
	{
		ignores: ["dist/*", "build/*", "coverage/*", ".expo/*", "node_modules/*", ".claude/**", ".specify/**", "specs/**"],
	},
	{
		files: ["src/**/*.{ts,tsx}"],
		rules: {
			"no-restricted-syntax": ["error", NO_ENUM_SELECTOR],
			"import/order": [
				"warn",
				{
					groups: ["builtin", "external", "internal", ["parent", "sibling", "index"]],
					pathGroups: [{ pattern: "@/**", group: "internal" }],
					pathGroupsExcludedImportTypes: ["builtin"],
					"newlines-between": "always",
				},
			],
			// False positives on libraries exporting a default and a same-named member (i18next).
			"import/no-named-as-default": "off",
			"import/no-named-as-default-member": "off",
		},
	},
	{
		files: APP_SOURCES,
		// Vendor branding (Google / Apple sign-in) is the documented exception to tokens (ch. 07).
		ignores: ["src/**/__tests__/**", "src/**/*-sign-in-button/**"],
		rules: {
			"no-restricted-syntax": ["error", NO_ENUM_SELECTOR, ...DESIGN_TOKEN_SELECTORS, UTC_DATE_SELECTOR],
		},
	},
	{
		files: ["src/**/*.{ts,tsx}"],
		ignores: DATA_ACCESS_FILES,
		rules: {
			"no-restricted-imports": [
				"error",
				{
					patterns: [
						{
							group: BACKEND_SDK,
							message:
								"Import the backend SDK only in its client or a data module (expo-playbook ch. 10).",
						},
					],
				},
			],
		},
	},
]);
