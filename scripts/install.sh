#!/usr/bin/env bash
# Links the playbook skills into the user's Claude Code skills folder:
#   ~/.claude/skills/expo-playbook -> skill/
#   ~/.claude/skills/expo-audit    -> skill-audit/
# Idempotent: re-running with the links already in place does nothing. Never overwrites
# anything else that sits at a destination.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
skills_dir="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"
mkdir -p "$skills_dir"

link_skill() {
	local name="$1" source_dir="$repo_root/$2"
	local link_path="$skills_dir/$name"

	if [[ ! -f "$source_dir/SKILL.md" ]]; then
		echo "error: $source_dir/SKILL.md not found" >&2
		return 1
	fi
	if [[ -L "$link_path" ]]; then
		local current
		current="$(cd "$link_path" && pwd -P)"
		if [[ "$current" == "$source_dir" ]]; then
			echo "ok: $link_path -> $source_dir (already linked)"
			return 0
		fi
		echo "error: $link_path already links to $current; remove it first if it should point here" >&2
		return 1
	fi
	if [[ -e "$link_path" ]]; then
		echo "error: $link_path exists and is not a symlink; move it away first" >&2
		return 1
	fi
	ln -s "$source_dir" "$link_path"
	echo "linked: $link_path -> $source_dir"
}

link_skill expo-playbook skill
link_skill expo-audit skill-audit

echo "projects activate the rules with this line in their CLAUDE.md:"
echo "  @~/.claude/skills/expo-playbook/rules/all.md"
echo "audit a project with /expo-audit (or: node ~/.claude/skills/expo-audit/scripts/audit.mjs <dir>)"
