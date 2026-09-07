# Orbit Project Guidelines & Rules

## 1. UI Component Sizing Standards (Ant Design)
- **Default Sizing Rule**: All Ant Design interactive and input components (including `Button`, `Segmented`, `Input`, `InputNumber`, `Select`, `Cascader`, `DatePicker`, `Radio.Group`, `Checkbox.Group`, etc.) **MUST USE Ant Design's DEFAULT size** (`middle` / default).
- **Prohibited Props**: Do **NOT** set `size="small"` on buttons, segmented controls, or form input components unless explicitly requested by the user for micro-inline badges.
- **Visual Consistency**: Keep form controls and action buttons standard, legible, and easy to tap/click across all admin dashboard pages.

## 2. Real Data & No Mock Fallback Invariants
- All dashboard pages must query real DB tables and official BFF APIs.
- Zero mock seed data or fallback fake seeds in production/development logic.

## 3. Layout & Multi-language (i18n)
- Container `.shell-content-inner` must maintain `overflowX: "hidden"` and `maxWidth: "100%"` to prevent unwanted horizontal scrollbars.
- Use `useI18n()` / `tt()` for all user-facing labels without bracketed English text in Chinese mode.
