/**
 * PM2 ecosystem config — bun only
 */
module.exports = {
  apps: [
    {
      name: 'translations-api',
      script: 'bun',
      args: 'src/index.ts',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
      },
      watch: false,
      max_memory_restart: '1G',
      instances: 1,
      exec_mode: 'fork',
    },
  ],
};
