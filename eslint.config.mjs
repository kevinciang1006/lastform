import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      // Vendored third-party design export, not application source. `next
      // lint` never covered this (it only scans pages/app/components/lib/src
      // by default); calling the ESLint CLI directly on `.` would otherwise
      // sweep it in and report on code we don't own.
      "docs/**",
    ],
  },
];

export default eslintConfig;
