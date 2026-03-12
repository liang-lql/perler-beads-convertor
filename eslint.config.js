import eslintPluginVue from 'eslint-plugin-vue'

export default [
  {
    files: ['**/*.{js,jsx,cjs,mjs,vue}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...eslintPluginVue.environments.vue.globals,
        defineProps: 'readonly',
        defineEmits: 'readonly',
        defineExpose: 'readonly',
        withDefaults: 'readonly',
      },
    },
    plugins: {
      vue: eslintPluginVue,
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/no-unused-vars': 'error',
      'vue/component-tags-order': ['error', {
        order: ['script', 'template', 'style']
      }],
    },
  },
]