/**
 * PM2 ecosystem config — bun only
 */
module.exports = {
  apps: [
    {
      name: 'zrok-service',
      script: 'zrok',
      args: `share reserved ${process.env.ZROK_TOKEN} --headless`,
      interpreter: 'none',
      autorestart: true,
      watch: false,
    },
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
