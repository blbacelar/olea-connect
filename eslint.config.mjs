import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import { defineConfig, globalIgnores } from "eslint/config";
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript";
import importX from "eslint-plugin-import-x";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

import quality from "./eslint-rules/index.cjs";

const appSourceFiles = [
  "app/**/*.{js,jsx,ts,tsx,mjs,cjs}",
  "components/**/*.{js,jsx,ts,tsx,mjs,cjs}",
  "hooks/**/*.{js,jsx,ts,tsx,mjs,cjs}",
  "lib/**/*.{js,jsx,ts,tsx,mjs,cjs}",
  "utils/**/*.{js,jsx,ts,tsx,mjs,cjs}",
  "scripts/**/*.{js,jsx,ts,tsx,mjs,cjs}",
  "tests/**/*.{js,jsx,ts,tsx,mjs,cjs}",
  "*.{js,mjs,cjs,ts,tsx}",
];

const presentationFiles = [
  "components/**/*.{ts,tsx}",
  "hooks/**/*.{ts,tsx}",
];

const testFiles = [
  "**/*.test.{ts,tsx}",
  "**/*.spec.{ts,tsx}",
  "tests/**/*.{ts,tsx}",
  "**/{__tests__,__mocks__,fixtures,mocks}/**/*.{ts,tsx}",
];

export default defineConfig([
  globalIgnores([
    ".claude/**",
    ".next/**",
    ".supabase-home/**",
    ".vercel/**",
    "coverage/**",
    "dist/**",
    "build/**",
    "graphify-out/**",
    "node_modules/**",
    "playwright-report/**",
    "test-results/**",
    "supabase/.branches/**",
    "supabase/.temp/**",
    "**/*.tsbuildinfo",
    "package-lock.json",
  ]),
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { tsconfigRootDir: import.meta.dirname },
      globals: {
        AbortController: "readonly",
        Blob: "readonly",
        Buffer: "readonly",
        clearInterval: "readonly",
        clearTimeout: "readonly",
        console: "readonly",
        crypto: "readonly",
        document: "readonly",
        File: "readonly",
        FormData: "readonly",
        Headers: "readonly",
        localStorage: "readonly",
        navigator: "readonly",
        process: "readonly",
        ReadableStream: "readonly",
        Request: "readonly",
        Response: "readonly",
        setInterval: "readonly",
        setTimeout: "readonly",
        URL: "readonly",
        window: "readonly",
      },
    },
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: appSourceFiles,
    plugins: {
      "@next/next": nextPlugin,
      "import-x": importX,
      "jsx-a11y": jsxA11y,
      "react-hooks": reactHooks,
      quality,
    },
    settings: {
      "import-x/resolver-next": [createTypeScriptImportResolver()],
      next: { rootDir: ["./"] },
      react: { version: "detect" },
    },
    rules: {
      ...nextPlugin.configs["core-web-vitals"].rules,
      // Baseline on 2026-09-03: 2 warnings. Promote to error when this reaches 0.
      "import-x/no-duplicates": "warn",
      "import-x/no-unresolved": "warn",
      "jsx-a11y/alt-text": "warn",
      "no-constant-binary-expression": "warn",
      "no-control-regex": "warn",
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-empty-pattern": "warn",
      "no-var": "error",
      "prefer-const": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/rules-of-hooks": "error",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Baseline on 2026-09-03: 2 warnings. Promote to error when this reaches 0.
      "@typescript-eslint/no-explicit-any": "warn",
      complexity: ["warn", 12],
      "max-depth": ["warn", 4],
      "max-lines-per-function": [
        "warn",
        { max: 150, skipBlankLines: true, skipComments: true },
      ],
      "max-nested-callbacks": ["warn", 3],
      "max-params": ["warn", 4],
      "max-statements": ["warn", 20],
      // MAX_LINES=350. Baseline on 2026-09-03: 74 warnings.
      "quality/max-lines": ["warn", { max: 350 }],
      "quality/no-direct-console": [
        // Baseline on 2026-09-03: 37 warnings.
        "warn",
        { logger: "lib/observability/logger" },
      ],
    },
  },
  {
    files: presentationFiles,
    plugins: { quality },
    rules: {
      // Baseline on 2026-09-03: 1 warning.
      "quality/no-direct-data-access": [
        "warn",
        {
          modules: [
            "@/utils/supabase/admin",
            "@/utils/supabase/client",
            "@/utils/supabase/server",
          ],
          bindings: [
            "createAdminClient",
            "createClient",
            "createPublicServerClient",
          ],
          layers: ["/components/", "/hooks/"],
        },
      ],
    },
  },
  {
    files: [
      "lib/observability/logger.ts",
      "eslint-rules/**/*.cjs",
      "*.config.{js,mjs,cjs}",
    ],
    rules: {
      "quality/no-direct-console": "off",
    },
  },
  {
    files: testFiles,
    rules: {
      "max-lines-per-function": "off",
      "max-nested-callbacks": "off",
      "max-statements": "off",
      "quality/max-lines": ["warn", { max: 350, includeTests: true }],
      "quality/no-direct-console": "off",
      "quality/no-direct-data-access": "off",
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/rules-of-hooks": "off",
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "no-undef": "off",
    },
  },
  {
    files: ["eslint-rules/**/*.cjs", "*.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        module: "readonly",
        require: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]);
