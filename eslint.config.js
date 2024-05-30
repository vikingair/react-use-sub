// @ts-check

import js from "@eslint/js";
// @ts-expect-error https://github.com/import-js/eslint-plugin-import/issues/2948
import imp from "eslint-plugin-import";
import prettier from "eslint-plugin-prettier";
// support will be added soon: https://github.com/jsx-eslint/eslint-plugin-react/pull/3727
import react from "eslint-plugin-react";
// import reactRecommended from "eslint-plugin-react/configs/recommended.js";
// support will be added soon: https://github.com/facebook/react/pull/28773
import reactHooks from "eslint-plugin-react-hooks";
import simpleImpSort from "eslint-plugin-simple-import-sort";
import ts from "typescript-eslint";

export default ts.config(
  { ignores: ["node_modules", "**/dist"] },
  {
    files: ["**/*.{j,t}s?(x)"],
    extends: [
      js.configs.recommended,
      ...ts.configs.recommended,
      // reactRecommended, // not compatible currently
      // reactHooks.configs.recommended, // not compatible currently
    ],
    plugins: {
      prettier,
      import: imp,
      "simple-import-sort": simpleImpSort,
      "react-hooks": reactHooks,
      react,
    },
    rules: {
      "prettier/prettier": "warn",
      "arrow-body-style": ["warn", "as-needed"],
      "no-console": "warn",
      eqeqeq: ["error", "always"],
      "simple-import-sort/imports": [
        "warn",
        {
          groups: [
            [
              "vitest",
              // scss and css file imports
              "\\.s?css$",
              // side effect (e.g. `import "./foo"`)
              "^\\u0000",
              // every import starting with "react"
              "^react",
              // things that start with a letter (or digit or underscore), or `@` followed by a letter
              "^@?\\w",
              // internal relative paths
              "^\\.",
            ],
          ],
        },
      ],
      "simple-import-sort/exports": "warn",
      "no-restricted-imports": [
        "error",
        {
          patterns: ["**/build/*", "**/dist/*"],
        },
      ],
      "import/no-duplicates": "warn",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["**/*.d.ts"],
    rules: {
      "no-var": "off",
    },
  },
  {
    files: ["**/*.test.ts?(x)"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
);
