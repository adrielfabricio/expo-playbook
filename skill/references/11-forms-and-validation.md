---
title: "Forms and validation"
chapter: 11
tags: [forms, react-hook-form, zod, validation, i18n, dates, money]
applies_to: ["src/**/schema.ts", "src/**/*-schema.ts", "src/**/use-*-form.ts", "src/**/screens/**", "src/app/**"]
related: [06-typescript.md, 07-components-and-design-system.md, 12-i18n.md]
last_updated: 2026-10-28
---

# Forms and validation

## Stack

`react-hook-form` + `zod` + `@hookform/resolvers/zod`. A trivially small auth form may use local `useState`, but anything with validation uses the stack.

## Rules

- **Always `Controller` + `render`.** Never `register()` — it relies on DOM refs, broken on RN.
- Inputs are the canonical fields (`TextField`, `DateField`, `TimeField`, `Select`, `SwitchField`) built on `Field`, so every field has the same height, label, optional mark and error line.
- The form's state and submit logic live in a hook (`use-<entity>-form.ts`) or the screen's orchestration hook; the screen renders.
- **Schemas are module-level constants** (`schema.ts` in the feature, or `types/` when they are the data contract), never built inside a component with `t`. A schema that needs a hook cannot be used at the API boundary or in a backup import.
- One field, one definition: a stored-row schema and a form schema for the same table are built from the same field rules.
- Derive types: `type TaskDraft = z.infer<typeof taskDraftSchema>`.

## Validation messages are i18n keys

A Zod message carries the **key**, never a sentence:

```ts
export const taskDraftSchema = z.object({
	name: z.string().trim().min(1, "validation.taskNameRequired"),
});
```

Screens resolve it through one hook that returns the whole prop object, so a field cannot half-adopt the pattern:

```tsx
const fieldError = useFieldError();

<Controller
	control={control}
	name="name"
	render={({ field }) => (
		<TextField label={t("tasks.name")} value={field.value} onChangeText={field.onChange} {...fieldError(formState.errors.name)} />
	)}
/>;
```

A test asserts that every message a schema can emit resolves to something other than itself in each locale — a missing key renders `validation.taskNameRequired` to the user.

## Values that are never typed

- **Dates and times are picked, never typed.** `DateField` shows the locale format and carries `YYYY-MM-DD` in and out; `TimeField` carries `HH:MM`. Both open the platform picker. Bounds make an impossible date unreachable rather than rejected.
- Validate calendar dates by round-tripping the parsed parts — `!isNaN(new Date(v))` accepts `2026-02-31` (rolls to March 3).
- Read the Android Material date picker's result through its **UTC** parts: it reports UTC midnight, which is the previous day west of UTC with local getters.

## Numbers and money

- Store **integer minor units**: cents, kilometres, millilitres, thousandths of a currency unit for unit prices. The only non-integers are derived ratios, never stored.
- Typing money on a number pad goes through one core helper (digits → minor units) and one formatter (minor units → text with `Intl` in the active locale). No feature keeps its own copy.
- `TextInput` values are strings; parse at the boundary of the computation, not in the UI.

## Failure handling

Because a network failure is expected (chapter 13), a failed submit **preserves everything the user typed** and shows a clear message; it never silently discards input or queues for later unless the app is offline-first by design.
