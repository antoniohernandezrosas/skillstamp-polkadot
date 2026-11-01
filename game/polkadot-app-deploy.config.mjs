export default {
  domain: process.env.APP_DOT,

  displayName: 'SkillStamp',

  description:
    'Credenciales académicas verificables y revocables en Polkadot.',

  icon: {
    path: './assets/icono.png',
    format: 'png'
  },

  executables: [
    {
      kind: 'app',
      path: './dist',
      appVersion: [1, 0, 0]
    }
  ]
};