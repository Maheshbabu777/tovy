const expoConfig = require('eslint-config-expo/flat')

module.exports = [
  ...expoConfig,
  // supabase/functions is Deno code, checked with `deno lint` and `deno check` (see its deno.json).
  { ignores: ['dist/*', '.expo/*', 'node_modules/*', '.powers/*', 'test-results/*', 'supabase/functions/*'] },
]
