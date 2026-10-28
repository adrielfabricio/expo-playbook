import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * Dynamic Expo config — expo-playbook ch. 16.
 *
 * APP_ENV comes from the EAS profile (eas.json `env`) and is NOT inlined into the bundle: the app
 * reads `extra.appEnv` through expo-constants. EAS CLI does not read `.env`, so `owner` and the
 * project id are written here.
 */

const APP_ENVIRONMENTS = ["development", "preview", "production"] as const;

type AppEnvironment = (typeof APP_ENVIRONMENTS)[number];

/** Public vars a production build cannot ship without. */
const REQUIRED_PRODUCTION_VARS: readonly string[] = [
	// "EXPO_PUBLIC_SENTRY_DSN",
	// "EXPO_PUBLIC_SUPABASE_URL",
];

function appEnvironment(): AppEnvironment {
	const raw = (process.env.APP_ENV ?? process.env.EAS_BUILD_PROFILE ?? "").trim().toLowerCase();
	return APP_ENVIRONMENTS.find((value) => value === raw) ?? "development";
}

function assertProductionEnv(): void {
	for (const key of REQUIRED_PRODUCTION_VARS) {
		if (!(process.env[key] ?? "").trim()) {
			throw new Error(
				`[app.config] APP_ENV=production is missing ${key}. Fill the EAS environment "production" before building.`,
			);
		}
	}
}

export default ({ config }: ConfigContext): ExpoConfig => {
	const appEnv = appEnvironment();
	const isProduction = appEnv === "production";
	if (isProduction) assertProductionEnv();

	return {
		...config,
		name: isProduction ? "<App Name>" : "<App Name> Dev",
		slug: "<app-slug>",
		version: "1.0.0",
		owner: "<expo-owner>",
		orientation: "portrait",
		icon: "./assets/images/icon.png",
		scheme: isProduction ? "<scheme>" : "<scheme>-dev",
		// "light" | "dark" for a single palette; "automatic" only with a dynamic theme (ch. 08).
		userInterfaceStyle: "light",
		// Mirrors colors.background — app.config.ts cannot import from src/.
		backgroundColor: "#FFFFFF",
		ios: {
			bundleIdentifier: isProduction ? "com.<app>" : "com.<app>.dev",
			supportsTablet: false,
			config: { usesNonExemptEncryption: false },
		},
		android: {
			package: isProduction ? "com.<app>" : "com.<app>.dev",
			// Permissions dependencies would merge in but the app must not request.
			blockedPermissions: [],
		},
		plugins: [
			"expo-router",
			"expo-localization",
			[
				"expo-splash-screen",
				{ backgroundColor: "#FFFFFF", image: "./assets/images/splash.png", imageWidth: 240 },
			],
			[
				"@sentry/react-native/expo",
				{ organization: "<sentry-org>", project: "<sentry-project>", url: "https://sentry.io/" },
			],
		],
		experiments: {
			typedRoutes: true,
			reactCompiler: true,
		},
		extra: {
			appEnv,
			eas: { projectId: "<eas-project-id>" },
		},
	};
};
