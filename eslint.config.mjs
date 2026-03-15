import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    'vue/multi-word-component-names': 'off',
    'vue/no-multiple-template-root': 'off',
    'vue/attribute-hyphenation': ['error', 'never'],
    'vue/v-on-event-hyphenation': ['error', 'never', { autofix: true }],
    '@typescript-eslint/no-unused-vars': 'off',
    'comma-dangle': ['error', 'always-multiline'],
    '@stylistic/brace-style': ['error', '1tbs'],
  },
})
