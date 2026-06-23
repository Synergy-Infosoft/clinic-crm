import { FlatCompat } from '@eslint/eslintrc'

const compat = new FlatCompat({ baseDirectory: import.meta.dirname })

const eslintConfig = [
  { ignores: ['.next/**', 'node_modules/**', 'coverage/**', 'supabase/.temp/**', '*.cjs', 'build_output.txt', 'next-env.d.ts'] },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
]

export default eslintConfig
