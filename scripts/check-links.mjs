#!/usr/bin/env node
/**
 * Integrity check for the playbook: relative Markdown links and their #anchors resolve, `@` imports
 * in rules resolve, every chapter has valid frontmatter, its `related` entries exist, and SKILL.md
 * names every chapter. Exits 1 on any problem.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKILL_DIR = join(ROOT, "skill");
const REFERENCES_DIR = join(SKILL_DIR, "references");
const REQUIRED_CHAPTER_KEYS = ["title", "chapter", "tags", "applies_to", "related", "last_updated"];
const LINK_PATTERN = /\[[^\]]*\]\(([^)\s]+)\)/g;

const problems = [];

function walk(dir) {
	return readdirSync(dir).flatMap((name) => {
		// audits/ holds local, gitignored reports of private projects.
		if (name === ".git" || name === "node_modules" || name === "audits") return [];
		const path = join(dir, name);
		return statSync(path).isDirectory() ? walk(path) : [path];
	});
}

function stripCode(markdown) {
	return markdown.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
}

function slugify(heading) {
	return heading
		.trim()
		.toLowerCase()
		.replace(/[^\p{L}\p{N}\s_-]/gu, "")
		.replace(/\s/g, "-");
}

function anchorsOf(file) {
	const text = readFileSync(file, "utf8").replace(/```[\s\S]*?```/g, "");
	return new Set(
		[...text.matchAll(/^#{1,6}\s+(.+)$/gm)].map((match) => slugify(match[1].replace(/`/g, ""))),
	);
}

function frontmatterOf(text) {
	const match = text.match(/^---\n([\s\S]*?)\n---\n/);
	if (!match) return null;
	const fields = {};
	let currentKey = null;
	for (const line of match[1].split("\n")) {
		const keyMatch = line.match(/^([a-z_]+):\s*(.*)$/);
		if (keyMatch) {
			currentKey = keyMatch[1];
			fields[currentKey] = keyMatch[2];
		} else if (currentKey && line.trim().startsWith("- ")) {
			fields[currentKey] = `${fields[currentKey]} ${line.trim().slice(2)}`.trim();
		}
	}
	return fields;
}

function checkLinks(file) {
	const text = stripCode(readFileSync(file, "utf8"));
	for (const [, target] of text.matchAll(LINK_PATTERN)) {
		if (/^(https?:|mailto:)/.test(target)) continue;
		const [pathPart, anchor] = target.split("#");
		const resolved = pathPart ? resolve(dirname(file), pathPart) : file;
		if (!existsSync(resolved)) {
			problems.push(`${relative(ROOT, file)}: broken link -> ${target}`);
			continue;
		}
		if (anchor && resolved.endsWith(".md") && !anchorsOf(resolved).has(anchor)) {
			problems.push(`${relative(ROOT, file)}: missing anchor -> ${target}`);
		}
	}
}

function checkImports(file) {
	for (const line of readFileSync(file, "utf8").split("\n")) {
		const match = line.match(/^@(\S+)$/);
		if (!match || match[1].startsWith("~")) continue;
		if (!existsSync(resolve(dirname(file), match[1]))) {
			problems.push(`${relative(ROOT, file)}: broken @import -> ${match[1]}`);
		}
	}
}

/** Line numbers where prose continues on the next line (hard wrap) — chapter 18 forbids it. */
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

function checkHardWraps(file) {
	const hits = hardWraps(readFileSync(file, "utf8"));
	if (hits.length) problems.push(`${relative(ROOT, file)}: hard-wrapped prose at line(s) ${hits.slice(0, 5).join(", ")}`);
}

function checkChapters() {
	const chapters = readdirSync(REFERENCES_DIR).filter((name) => name.endsWith(".md"));
	const skill = readFileSync(join(SKILL_DIR, "SKILL.md"), "utf8");
	const skillFrontmatter = frontmatterOf(skill);
	if (!skillFrontmatter?.name || !skillFrontmatter?.description) {
		problems.push("skill/SKILL.md: frontmatter needs name and description");
	}

	for (const name of chapters) {
		const file = join(REFERENCES_DIR, name);
		const fields = frontmatterOf(readFileSync(file, "utf8"));
		if (!fields) {
			problems.push(`references/${name}: no frontmatter`);
			continue;
		}
		for (const key of REQUIRED_CHAPTER_KEYS) {
			if (!(key in fields)) problems.push(`references/${name}: frontmatter missing "${key}"`);
		}
		const related = (fields.related ?? "").replace(/[[\]]/g, "").split(/[,\s]+/).filter(Boolean);
		for (const entry of related) {
			if (!existsSync(join(REFERENCES_DIR, entry))) {
				problems.push(`references/${name}: related entry not found -> ${entry}`);
			}
		}
		if (!skill.includes(`references/${name}`)) {
			problems.push(`skill/SKILL.md: does not link references/${name}`);
		}
	}
}

const markdownFiles = walk(ROOT).filter((file) => file.endsWith(".md"));
// Template links are relative to the project the template is copied into.
const TEMPLATES_DIR = join(SKILL_DIR, "templates");
markdownFiles.filter((file) => !file.startsWith(TEMPLATES_DIR)).forEach(checkLinks);
walk(join(SKILL_DIR, "rules")).forEach(checkImports);
markdownFiles.forEach(checkHardWraps);
checkChapters();

if (problems.length > 0) {
	console.error(problems.join("\n"));
	console.error(`\n${problems.length} problem(s) in ${markdownFiles.length} Markdown files.`);
	process.exit(1);
}
console.log(`ok: ${markdownFiles.length} Markdown files, all links, anchors, imports and frontmatter valid.`);
