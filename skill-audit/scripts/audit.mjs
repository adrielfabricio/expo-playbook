#!/usr/bin/env node
/**
 * Mechanical conformance check of an Expo app against the expo-playbook.
 *
 * Usage: node audit.mjs <project-dir> [--json] [--ci] [--write [file]]
 *   --json          machine-readable output
 *   --ci            exit 1 when any check fails
 *   --write [file]  also write an actionable report for an agent, by default to
 *                   <project-dir>/docs/audits/expo-audit-YYYY-MM-DD.md — the only file it writes
 *
 * Every check is a heuristic over file contents; the expo-audit skill confirms hits by reading the
 * code and downgrades deviations the project declares in AGENTS.md.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";

const SKIP_DIRS = new Set(["node_modules", ".git", ".expo", "ios", "android", "build", "dist", "coverage"]);
const EXTRA_TS_FLAGS = [
	"noUncheckedIndexedAccess",
	"exactOptionalPropertyTypes",
	"noImplicitOverride",
	"noFallthroughCasesInSwitch",
];
const CANONICAL_PRETTIER = {
	useTabs: true,
	tabWidth: 2,
	semi: true,
	singleQuote: false,
	trailingComma: "all",
	printWidth: 100,
	arrowParens: "always",
	endOfLine: "lf",
};
const REQUIRED_SCRIPTS = ["check:lint", "check:types", "check:unused", "format:write", "format:check", "test:unit"];
const PLAYBOOK_RULES = /^(keep-docs-in-sync|dead-code-sweep.*|specify-rules|speckit-policy|file-layout|naming-in-english|no-spec-refs-in-code)\.md$/;
const COPIED_EXPO_SKILL = /^(expo-|eas-|building-native-ui$|react-native-best-practices$|git-commit$|create-agentsmd$|create-readme$|claude-md-improver$)/;
const THEME_PATH = /\/(core\/theme|global\/theme|design)\//;
const MONITORING_PATH = /(utils\/sentry\.utils\.ts|core\/monitoring\/[^/]+|core\/sentry\.ts)$/;
const DATA_DOOR_PATH = /\/(repositories|services|core|db|data)\/|\/features\/[^/]+\/(queries|mutations)\.ts$|storage/;
const BACKEND_SDK = /from ["'](firebase\/(firestore|auth|storage)|@supabase\/supabase-js|@react-native-async-storage\/async-storage|drizzle-orm\/expo-sqlite)["']/;

/** Stable path of the playbook chapters once installed (scripts/install.sh). */
const CHAPTERS_DIR = "~/.claude/skills/expo-playbook/references";
const CHAPTER_FILES = {
	"01": "01-architecture-overview.md",
	"03": "03-architecture-feature-based.md",
	"04": "04-naming-and-files.md",
	"06": "06-typescript.md",
	"07": "07-components-and-design-system.md",
	"08": "08-styling-and-theme.md",
	"09": "09-navigation-expo-router.md",
	"10": "10-state-and-data.md",
	"13": "13-errors-and-observability.md",
	"15": "15-tooling-and-config.md",
	"16": "16-environments-builds-releases.md",
	"18": "18-documentation-system.md",
	"19": "19-agent-workflow.md",
};
const TEMPLATES = "~/.claude/skills/expo-playbook/templates";

/** How to resolve each failing check. */
const FIXES = {
	"arch.detected": "Make the layout match layered (ch. 02) or feature-based (ch. 03) and state the choice in AGENTS.md.",
	"alias.single": "Keep only `@/*` and `@/assets/*` in tsconfig `paths`, then rewrite every import that uses another alias.",
	"ts.strict": "Enable `strict: true` in tsconfig.json and fix the errors.",
	"ts.extras": "Enable the listed flags in a dedicated change and fix the errors; if not now, record them as tech debt in AGENTS.md.",
	prettier: `Copy ${TEMPLATES}/.prettierrc, then run \`npm run format:write\` as a formatting-only commit.`,
	"node.version": "Pin Node 24 in `.nvmrc`.",
	"scripts.naming": "Rename the scripts to `domain:action[:variant]` and update README, AGENTS.md and CI that call them.",
	"scripts.required": `Add the missing scripts from ${TEMPLATES}/package.scripts.json.`,
	"eslint.no-enum": `Merge the TSEnumDeclaration rule from ${TEMPLATES}/eslint.config.js.`,
	"eslint.sdk-restriction": `Merge the no-restricted-imports block from ${TEMPLATES}/eslint.config.js, with this app's SDK and data-layer paths.`,
	"eslint.tokens": `Merge the design-token selectors from ${TEMPLATES}/eslint.config.js.`,
	"eslint.boundaries": `Add ${TEMPLATES}/eslint.arch.config.js and a \`check:arch\` script; prove it fails on a planted violation, then revert it.`,
	"eslint.no-cycle": "Add `import/no-cycle` to eslint.arch.config.js (see the template).",
	"appconfig.ts": `Convert the static config to app.config.ts (${TEMPLATES}/app.config.ts), keeping identity and plugins.`,
	"appconfig.appEnv": "Read APP_ENV in app.config.ts, write `extra.appEnv`, and read it at runtime through expo-constants (`getAppEnv()`).",
	"eas.appEnv": `Give every EAS build profile \`env.APP_ENV\` (and \`SENTRY_ENVIRONMENT\`), as in ${TEMPLATES}/eas.json.`,
	changelog: `Add CHANGELOG.md from ${TEMPLATES}/CHANGELOG.md.`,
	"wiring.import": "Add `@~/.claude/skills/expo-playbook/rules/all.md` to CLAUDE.md (template: CLAUDE.template.md).",
	"agents.deviations": "Add `## Doc map` and `## Deviations from the playbook` to AGENTS.md (templates: AGENTS.*.md).",
	"rules.copies": "Delete the listed rule copies; move any project-specific rows into AGENTS.md § Doc map.",
	"skills.copies": "Remove the copied skills from the repository; install them once at user level (ch. 19).",
	"skills.firebase": "Remove the Firebase skills this app does not use.",
	"code.alert": "Replace each `Alert.alert` with `useDialogStore().show({ title, message, actions })`, rendered by the single `DialogHost`.",
	"code.enum": "Replace each enum with a string union type.",
	"code.any": "Replace `any` with `unknown` and narrow, or with the real type.",
	"code.arrow-functions": "Declare named functions with `function`. Ignore hits that are inline callbacks or object attributes.",
	"code.hex": "Move each colour into the theme as a semantic role and read the token. Vendor branding (Google/Apple buttons) is the only exception.",
	"code.raw-text": "Render text through `Typography` (`variant`, `color`); create the primitive first if the app lacks it.",
	"code.inline-style": "Move static styles into `styles.ts`; keep inline only continuous or animated values.",
	"code.flatlist": "Use FlashList v2 for long lists (no size-estimation props). Inside a bottom sheet, the sheet's own list is correct — drop those hits.",
	"code.raw-icons": "Render glyphs through the `Icon` wrapper with a `GLYPHS` vocabulary; only `Icon` imports the icon family.",
	"code.sentry-importers": "Report through `sentryUtils` in the monitoring module; only that module imports `@sentry/react-native`.",
	"code.console": "Report with `sentryUtils` and give the user feedback (toast / dialog / ScreenState), or delete the log.",
	"code.spec-refs": "Rewrite the comment to state the constraint itself; move durable contracts to a committed doc or ADR.",
	"code.layer-aliases": "Rewrite the import with the `@/` alias.",
	"code.i-prefix": "Drop the `I` prefix from the interface and its usages.",
	"code.styled-components": "Replace styled-components with `StyleSheet.create` in `styles.ts`; remove the dependency and its typings.",
	"code.data-door": "Move the SDK call into a repository / data module. Type-only imports (`import type`) are fine — drop those hits.",
	"styles.default-export": "Make styles.ts `export default StyleSheet.create(…)` (or `export default function createStyles(theme)`), and import it as a default.",
	"utils.namespace": "Make the module `export default { … }` of `function` declarations, re-exported from its folder's barrel as `xUtils`; update call sites to `xUtils.fn()`.",
	"utils.types": "Move the exported types to the types folder and import them with `import type`.",
	"hooks.named": "Turn the hook into `use-x.ts` with `export function useX`; update the barrel and imports.",
	"app.routes-only": "Move the file out of `src/app/` (to the feature, `shell/` or `shared/`).",
	"barrels.no-star": "List every export explicitly.",
	"barrels.why-public": "Add a one-line comment above each export saying which consumer needs it.",
	"docs.hard-wrap": "Unwrap the prose: one line per paragraph, list item or blockquote. Keep headings, tables, code and frontmatter as they are.",
};

const args = process.argv.slice(2);
const writeIndex = args.indexOf("--write");
const writeTarget = writeIndex >= 0 && args[writeIndex + 1] && !args[writeIndex + 1].startsWith("--") ? args[writeIndex + 1] : null;
const projectArg = args.find((arg, index) => !arg.startsWith("--") && !(writeTarget && index === writeIndex + 1));
if (!projectArg) {
	console.error("usage: node audit.mjs <project-dir> [--json] [--ci] [--write [file]]");
	process.exit(2);
}
const ROOT = resolve(projectArg);
const SRC = join(ROOT, "src");
const results = [];

function readText(path) {
	return existsSync(path) ? readFileSync(path, "utf8") : null;
}

function readJson(path) {
	const text = readText(path);
	if (text === null) return null;
	try {
		return JSON.parse(text.replace(/^\s*\/\/.*$/gm, ""));
	} catch {
		return null;
	}
}

function walk(dir) {
	if (!existsSync(dir)) return [];
	return readdirSync(dir).flatMap((name) => {
		if (SKIP_DIRS.has(name)) return [];
		const path = join(dir, name);
		return statSync(path).isDirectory() ? walk(path) : [path];
	});
}

function record(chapter, id, status, title, samples = [], count = samples.length) {
	results.push({ chapter, id, status, title, count, samples: samples.slice(0, 200), fix: FIXES[id] });
}

function isCommentLine(line) {
	return /^\s*(\/\/|\*|\/\*)/.test(line);
}

/** Lines of source files (tests excluded) matching `pattern`, as "path:line" samples. */
function grep(files, pattern, { exclude } = {}) {
	const hits = [];
	for (const file of files) {
		if (exclude?.test(file)) continue;
		readFileSync(file, "utf8")
			.split("\n")
			.forEach((line, index) => {
				if (!isCommentLine(line) && pattern.test(line)) hits.push(`${relative(ROOT, file)}:${index + 1}`);
			});
	}
	return hits;
}

function checkCount(chapter, id, title, hits, severity) {
	record(chapter, id, hits.length === 0 ? "pass" : severity, title, hits, hits.length);
}

// ---------------------------------------------------------------- project shape
const pkg = readJson(join(ROOT, "package.json")) ?? {};
const deps = { ...pkg.dependencies, ...pkg.devDependencies };
const isFeatureBased = existsSync(join(SRC, "features"));
const isLayered = existsSync(join(SRC, "repositories")) || (existsSync(join(SRC, "hooks")) && !isFeatureBased);
const architecture = isFeatureBased ? "feature-based" : isLayered ? "layered" : "unknown";
record("01", "arch.detected", architecture === "unknown" ? "warn" : "info", `Architecture detected: ${architecture}`);

const sourceFiles = walk(SRC).filter((file) => /\.(ts|tsx)$/.test(file) && !file.includes("__tests__") && !file.endsWith(".d.ts"));

// ---------------------------------------------------------------- config
const tsconfig = readJson(join(ROOT, "tsconfig.json")) ?? {};
const options = tsconfig.compilerOptions ?? {};
const aliasKeys = Object.keys(options.paths ?? {}).filter((key) => key.startsWith("@"));
const extraAliases = aliasKeys.filter((key) => key !== "@/*" && key !== "@/assets/*" && !key.startsWith("@firebase"));
record("01", "alias.single", extraAliases.length || !aliasKeys.includes("@/*") ? "fail" : "pass", "Single `@/` alias in tsconfig paths", extraAliases);
record("06", "ts.strict", options.strict === true ? "pass" : "fail", "`strict: true`");
const missingFlags = EXTRA_TS_FLAGS.filter((flag) => options[flag] !== true);
record("06", "ts.extras", missingFlags.length ? "warn" : "pass", "Extra strict flags (required on new projects, debt on existing)", missingFlags);

const prettierFile = [".prettierrc", ".prettierrc.json"].map((name) => join(ROOT, name)).find(existsSync);
const prettier = prettierFile ? readJson(prettierFile) ?? {} : null;
const prettierDiffs = prettier
	? Object.entries(CANONICAL_PRETTIER).filter(([key, value]) => prettier[key] !== value).map(([key, value]) => `${key}: ${JSON.stringify(prettier[key])} → ${JSON.stringify(value)}`)
	: ["no .prettierrc"];
record("15", "prettier", prettierDiffs.length ? "warn" : "pass", "Prettier config matches the canonical one", prettierDiffs);

const nvmrc = readText(join(ROOT, ".nvmrc"))?.trim();
record("15", "node.version", nvmrc?.startsWith("24") ? "pass" : "warn", `.nvmrc pins Node 24 (found: ${nvmrc ?? "none"})`);

const scripts = Object.keys(pkg.scripts ?? {});
const badScriptNames = scripts.filter((name) => name !== "lint" && !/^[a-z0-9-]+:[a-z0-9-]+(:[a-z0-9-]+)?$/.test(name));
record("15", "scripts.naming", badScriptNames.length ? "fail" : "pass", "npm scripts are `domain:action[:variant]`", badScriptNames);
const requiredScripts = isFeatureBased ? [...REQUIRED_SCRIPTS, "check:arch"] : REQUIRED_SCRIPTS;
const missingScripts = requiredScripts.filter((name) => !scripts.includes(name));
record("15", "scripts.required", missingScripts.length ? "warn" : "pass", "Canonical scripts present", missingScripts);

const eslintText = [readText(join(ROOT, "eslint.config.js")), readText(join(ROOT, "eslint.arch.config.js"))].filter(Boolean).join("\n");
record("15", "eslint.no-enum", eslintText.includes("TSEnumDeclaration") ? "pass" : "warn", "ESLint forbids `enum`");
record("15", "eslint.sdk-restriction", eslintText.includes("no-restricted-imports") ? "pass" : "warn", "ESLint restricts the backend SDK to the data layer");
record("08", "eslint.tokens", /Raw hex|#\(\[0-9a-fA-F\]/.test(eslintText) ? "pass" : "warn", "ESLint blocks raw hex / style literals");
if (isFeatureBased) {
	const hasBoundaries = eslintText.includes("eslint-plugin-boundaries");
	record("03", "eslint.boundaries", hasBoundaries ? "pass" : "fail", "Boundaries enforced (eslint-plugin-boundaries)");
	record("03", "eslint.no-cycle", eslintText.includes("import/no-cycle") ? "pass" : "warn", "`import/no-cycle` enforced");
}

const appConfigTs = existsSync(join(ROOT, "app.config.ts"));
const appConfigText = readText(join(ROOT, "app.config.ts")) ?? readText(join(ROOT, "app.config.js")) ?? "";
record("16", "appconfig.ts", appConfigTs ? "pass" : "warn", "Dynamic `app.config.ts`", appConfigTs ? [] : [existsSync(join(ROOT, "app.config.js")) ? "app.config.js" : "app.json only"]);
record("16", "appconfig.appEnv", appConfigText.includes("appEnv") ? "pass" : "warn", "`extra.appEnv` written from APP_ENV");
const eas = readJson(join(ROOT, "eas.json"));
const profilesWithoutEnv = Object.entries(eas?.build ?? {}).filter(([, profile]) => !profile.extends && !profile.env?.APP_ENV).map(([name]) => name);
record("16", "eas.appEnv", eas && profilesWithoutEnv.length ? "warn" : eas ? "pass" : "n/a", "EAS profiles set `APP_ENV`", profilesWithoutEnv);
record("16", "changelog", existsSync(join(ROOT, "CHANGELOG.md")) ? "pass" : "warn", "CHANGELOG.md present");

// ---------------------------------------------------------------- agent wiring
const claudeMd = readText(join(ROOT, "CLAUDE.md")) ?? "";
record("18", "wiring.import", claudeMd.includes("expo-playbook/rules/all.md") ? "pass" : "warn", "CLAUDE.md imports the playbook rules");
const agentsMd = readText(join(ROOT, "AGENTS.md")) ?? "";
record("18", "agents.deviations", /##\s+Deviations/i.test(agentsMd) ? "pass" : "warn", "AGENTS.md has a Deviations section");
const rulesDir = join(ROOT, ".claude", "rules");
const copiedRules = existsSync(rulesDir) ? readdirSync(rulesDir).filter((name) => PLAYBOOK_RULES.test(name)) : [];
record("19", "rules.copies", copiedRules.length ? "warn" : "pass", "No copies of rules the playbook provides", copiedRules);
const skillDirs = [ROOT, dirname(ROOT), dirname(dirname(ROOT))].map((dir) => join(dir, ".claude", "skills")).filter(existsSync);
const skillNames = skillDirs.flatMap((dir) => readdirSync(dir).map((name) => ({ dir, name })));
const copiedSkills = skillNames.filter(({ name }) => COPIED_EXPO_SKILL.test(name)).map(({ dir, name }) => `${relative(ROOT, dir) || "."}/${name}`);
record("19", "skills.copies", copiedSkills.length ? "warn" : "pass", "Expo/EAS and generic skills come from user level, not copies", copiedSkills, copiedSkills.length);
const usesFirebaseJs = Boolean(deps.firebase);
const strayFirebase = skillNames.filter(({ name }) => /^firebase-|^extension-to-functions/.test(name) && !usesFirebaseJs).map(({ name }) => name);
record("19", "skills.firebase", strayFirebase.length ? "warn" : "pass", "No Firebase skills in an app without the Firebase JS SDK", strayFirebase);

// ---------------------------------------------------------------- code
const files = sourceFiles;
checkCount("07", "code.alert", "No `Alert.alert`", grep(files, /Alert\.alert/), "fail");
checkCount("06", "code.enum", "No `enum` declarations", grep(files, /^\s*(export\s+)?(const\s+)?enum\s/), "fail");
checkCount("06", "code.any", "No `any`", grep(files, /:\s*any\b|\bas any\b|<any>/), "fail");
checkCount("06", "code.arrow-functions", "Named functions are `function` declarations (heuristic)", grep(files, /^\s*(export\s+)?const\s+[a-z]\w*\s*=\s*(async\s*)?\([^)]*\)\s*(:\s*[^=]+)?=>/), "warn");
checkCount("08", "code.hex", "No hex colours outside the theme", grep(files, /["'`]#[0-9a-fA-F]{3,8}["'`]/, { exclude: /\/(core\/theme|global\/theme|design)\/|sign-in-button/ }), "fail");
const typographyUses = grep(files, /<Typography\b/).length;
const rawText = grep(files, /<Text[\s>]/, { exclude: /typography/ });
checkCount("07", "code.raw-text", `Text renders through Typography (${typographyUses} Typography uses)`, rawText, typographyUses === 0 && rawText.length ? "fail" : "warn");
checkCount("08", "code.inline-style", "No style objects created during render (`style={{`)", grep(files, /style=\{\{/), "warn");
checkCount("07", "code.flatlist", "Long lists use FlashList", grep(files, /(?<!BottomSheet)\bFlatList\b/), "warn");
checkCount("07", "code.raw-icons", "Icons go through the `Icon` wrapper", grep(files, /from ["']@expo\/vector-icons|from ["']@tabler\/icons/, { exclude: /\/icon\// }), "warn");
checkCount("13", "code.sentry-importers", "Only the monitoring module imports Sentry", grep(files, /from ["']@sentry\/react-native["']/, { exclude: MONITORING_PATH }), "warn");
checkCount("13", "code.console", "No console logging", grep(files, /console\.(log|error|warn)\(/), "warn");
checkCount("06", "code.spec-refs", "No Speckit references in code", grep(walk(SRC), /specs\/|spec\.md|\bFR-\d{3}\b|\bSC-\d{3}\b|User Story/), "fail");
checkCount("01", "code.layer-aliases", "No per-layer aliases (`@core/`, `@shared/`, `@features/`)", grep(files, /from ["']@(core|shared|features)\//), "fail");
checkCount("06", "code.i-prefix", "No `I`-prefixed interfaces", grep(files, /\binterface I[A-Z]\w*/), "warn");
checkCount("08", "code.styled-components", "No styled-components", grep(files, /from ["']styled-components/), "fail");
checkCount("10", "code.data-door", "Backend SDK only in the data layer (heuristic)", grep(files, BACKEND_SDK, { exclude: DATA_DOOR_PATH }), "warn");

const stylesFiles = files.filter((file) => basename(file) === "styles.ts");
const namedStyles = stylesFiles.filter((file) => /^export const (styles|createStyles)\b/m.test(readFileSync(file, "utf8"))).map((file) => relative(ROOT, file));
record("08", "styles.default-export", namedStyles.length ? "warn" : "pass", `styles.ts default-exports StyleSheet / createStyles (${stylesFiles.length} files)`, namedStyles, namedStyles.length);

const utilsFiles = files.filter((file) => file.endsWith(".utils.ts"));
const nonNamespaceUtils = utilsFiles.filter((file) => {
	const text = readFileSync(file, "utf8");
	return !/^export default \{/m.test(text) || /^export (async )?function /m.test(text);
});
record("04", "utils.namespace", nonNamespaceUtils.length ? "warn" : "pass", `Utils are default namespace objects (${utilsFiles.length} files)`, nonNamespaceUtils.map((file) => relative(ROOT, file)), nonNamespaceUtils.length);
const utilsWithTypes = utilsFiles.filter((file) => /^export (type|interface) /m.test(readFileSync(file, "utf8")));
record("04", "utils.types", utilsWithTypes.length ? "warn" : "pass", "Utils do not export types", utilsWithTypes.map((file) => relative(ROOT, file)), utilsWithTypes.length);

const hookFiles = files.filter((file) => /\/use-[^/]+\.tsx?$/.test(file) || /\/use-[^/]+\/index\.tsx?$/.test(file));
const legacyHooks = hookFiles.filter((file) => /\/index\.tsx?$/.test(file) || /^export default function use/m.test(readFileSync(file, "utf8")));
record("04", "hooks.named", legacyHooks.length ? "warn" : "pass", "Hooks are `use-x.ts` files with a named export", legacyHooks.map((file) => relative(ROOT, file)), legacyHooks.length);

const appDir = join(SRC, "app");
const appStrays = walk(appDir).filter((file) => /\/(components|hooks|utils|types)\//.test(relative(appDir, file)) || /\.(utils|types)\.ts$/.test(file)).map((file) => relative(ROOT, file));
record("09", "app.routes-only", appStrays.length ? "fail" : "pass", "`src/app/` holds routes and layouts only", appStrays);

if (isFeatureBased) {
	const barrels = readdirSync(join(SRC, "features")).map((name) => join(SRC, "features", name, "index.ts")).filter(existsSync);
	const starBarrels = barrels.filter((file) => /export \*/.test(readFileSync(file, "utf8"))).map((file) => relative(ROOT, file));
	record("03", "barrels.no-star", starBarrels.length ? "fail" : "pass", "Feature barrels never `export *`", starBarrels);
	const uncommented = barrels.filter((file) => !/\/\*\*|\/\//.test(readFileSync(file, "utf8"))).map((file) => relative(ROOT, file));
	record("03", "barrels.why-public", uncommented.length ? "warn" : "pass", `Feature barrels say why each export is public (${barrels.length} barrels)`, uncommented, uncommented.length);
}

// ---------------------------------------------------------------- docs

/** Line numbers where Markdown prose continues on the next line (hard wrap). */
function hardWraps(text) {
	// Link reference definitions ([id]: url) sit one per line by nature.
	const block = /^\s*([-*+]|\d+\.)\s|^#{1,6}\s|^\s*\||^\s*(```|~~~)|^\s*(---|\*\*\*)\s*$|^@\S|^\s*<!--|^\s*\[[^\]]+\]:\s/;
	const lines = text.split("\n");
	const hits = [];
	let inFence = false;
	let inComment = false;
	let inFrontmatter = lines[0] === "---";
	let previousIsProse = false;
	let previousIsQuote = false;
	lines.forEach((line, index) => {
		if (inFrontmatter) {
			if (index > 0 && line === "---") inFrontmatter = false;
			return;
		}
		if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
		if (inFence || /^\s*(```|~~~)/.test(line)) {
			previousIsProse = false;
			return;
		}
		if (inComment || /^\s*<!--/.test(line)) {
			inComment = !line.includes("-->");
			previousIsProse = false;
			return;
		}
		const isQuote = /^\s*>/.test(line);
		const isBlank = line.trim() === "" || (isQuote && line.replace(/^\s*>\s?/, "").trim() === "");
		const startsBlock = block.test(line) || (isQuote && !previousIsQuote);
		if (!isBlank && previousIsProse && !startsBlock) hits.push(index + 1);
		previousIsProse = !isBlank && !/^#{1,6}\s|^\s*\||^\s*(---|\*\*\*)\s*$|^@\S/.test(line);
		previousIsQuote = isQuote && !isBlank;
	});
	return hits;
}

const docFiles = [
	...["AGENTS.md", "CLAUDE.md", "README.md", "CHANGELOG.md"].map((name) => join(ROOT, name)).filter(existsSync),
	...walk(join(ROOT, "docs")).filter((file) => file.endsWith(".md") && !file.includes(`${join("docs", "audits")}`)),
	...walk(join(ROOT, ".claude", "rules")).filter((file) => file.endsWith(".md")),
];
const wrappedDocs = docFiles
	.map((file) => ({ file, hits: hardWraps(readFileSync(file, "utf8")) }))
	.filter(({ hits }) => hits.length > 0);
record(
	"18",
	"docs.hard-wrap",
	wrappedDocs.length ? "warn" : "pass",
	`Markdown prose is not hard-wrapped (${docFiles.length} docs)`,
	wrappedDocs.map(({ file, hits }) => `${relative(ROOT, file)}:${hits[0]} (${hits.length} wrapped lines)`),
	wrappedDocs.length,
);

// ---------------------------------------------------------------- output
const ICONS = { pass: "✅", warn: "⚠️", fail: "❌", info: "ℹ️", "n/a": "–" };
const totals = results.reduce((acc, result) => ({ ...acc, [result.status]: (acc[result.status] ?? 0) + 1 }), {});
const appName = pkg.name ?? basename(ROOT);

function localDate() {
	const now = new Date();
	const pad = (value) => String(value).padStart(2, "0");
	return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function chapterRef(chapter) {
	const file = CHAPTER_FILES[chapter];
	return file ? `\`${CHAPTERS_DIR}/${file}\`` : `chapter ${chapter}`;
}

function summaryTable(sampleLimit) {
	const lines = ["| Ch. | Status | Check | Count | Samples |", "| --- | --- | --- | --- | --- |"];
	for (const result of [...results].sort((a, b) => a.chapter.localeCompare(b.chapter))) {
		const samples = result.samples.slice(0, sampleLimit).map((sample) => `\`${sample}\``).join("<br>");
		lines.push(`| ${result.chapter} | ${ICONS[result.status]} | ${result.title} | ${result.status === "pass" ? "" : result.count || ""} | ${samples} |`);
	}
	return lines.join("\n");
}

/** The report an agent works through: one checkbox per failing check, with fix, standard and evidence. */
function agentReport() {
	const date = localDate();
	const open = results
		.filter((result) => result.status === "fail" || result.status === "warn")
		.sort((a, b) => (a.status === b.status ? a.chapter.localeCompare(b.chapter) : a.status === "fail" ? -1 : 1));
	const passing = results.filter((result) => result.status === "pass");

	const items = open.map((result, index) => {
		const evidence = result.samples.length
			? result.samples.map((sample) => `  - \`${sample}\``).join("\n") + (result.count > result.samples.length ? `\n  - … and ${result.count - result.samples.length} more (re-run the scan to list them)` : "")
			: "  - (project-level check — see the fix)";
		return [
			`### A${index + 1}. ${ICONS[result.status]} ${result.title}`,
			"",
			`- [ ] Resolved`,
			`- **Check:** \`${result.id}\` · **Occurrences:** ${result.count || "—"} · **Standard:** ${chapterRef(result.chapter)}`,
			`- **Fix:** ${result.fix ?? "See the chapter."}`,
			`- **Evidence:**`,
			evidence,
		].join("\n");
	});

	return `# Expo playbook audit — ${appName}

| | |
| --- | --- |
| Date | ${date} |
| Architecture | ${architecture} |
| Source files | ${sourceFiles.length} |
| Result | ✅ ${totals.pass ?? 0} · ⚠️ ${totals.warn ?? 0} · ❌ ${totals.fail ?? 0} |
| Generated by | \`node ~/.claude/skills/expo-audit/scripts/audit.mjs . --write\` (mechanical pass) |

## For the agent resolving this report

1. Load the \`expo-playbook\` skill and read this project's \`AGENTS.md\`, above all § Deviations. A
   difference declared there is **not** drift — leave it, and say so when you tick the item.
2. Work the action items in order (❌ before ⚠️). **One item per change**: read the linked chapter,
   confirm each evidence line in the code (these are heuristics — drop false positives and note why),
   fix every confirmed occurrence, and nothing else.
3. After each item run the Definition of Done (\`check:lint\` → \`format:write\`, \`check:types\`,
   \`check:arch\` if present, \`test:unit\`), keep docs in sync, and tick its box.
4. Re-run \`node ~/.claude/skills/expo-audit/scripts/audit.mjs .\` and confirm the item now passes.
5. Items marked L or touching many screens deserve their own spec. Ask the human before any change that
   alters behaviour or that the chapter does not settle. Do not commit unless asked.

## Action items

${items.length ? items.join("\n\n") : "None — every mechanical check passes."}

## Passing checks

${passing.map((result) => `- ✅ ${result.title}`).join("\n")}

## Summary table

${summaryTable(5)}
`;
}

if (args.includes("--json")) {
	console.log(JSON.stringify({ project: ROOT, app: appName, architecture, totals, results }, null, 2));
} else {
	console.log(`# expo-playbook mechanical audit — ${appName}\n`);
	console.log(`Architecture: **${architecture}** · ${sourceFiles.length} source files · ✅ ${totals.pass ?? 0} · ⚠️ ${totals.warn ?? 0} · ❌ ${totals.fail ?? 0}\n`);
	console.log(summaryTable(5));
	console.log("\nHeuristic checks: confirm each hit in the code; deviations declared in AGENTS.md are not drift.");
}

if (writeIndex >= 0) {
	const target = writeTarget
		? isAbsolute(writeTarget) ? writeTarget : join(ROOT, writeTarget)
		: join(ROOT, "docs", "audits", `expo-audit-${localDate()}.md`);
	mkdirSync(dirname(target), { recursive: true });
	writeFileSync(target, agentReport());
	console.error(`report written: ${relative(process.cwd(), target) || target}`);
}

if (args.includes("--ci") && totals.fail) process.exit(1);
