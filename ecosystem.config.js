const fs = require('fs');
const path = require('path');

// via stackoverflow, supposingly pm2 has problems with classic dotenv
const loadEnv = () => {
  try {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const env = {};
      content.split('\n').forEach((line) => {
        if (!line || line.startsWith('#') || !line.includes('=')) return;

        const [key, ...val] = line.split('=');
        env[key.trim()] = val
          .join('=')
          .trim()
          .replace(/^["']|["']$/g, '');
      });
      return env;
    }
  } catch (e) {
    console.error('Błąd odczytu .env:', e);
    return {};
  }
  return {};
};

const envVars = loadEnv();

/**
 * PM2 ecosystem config — bun only
 */
module.exports = {
  apps: [
    {
      name: 'zrok-service',
      script: 'zrok',
      args: `share reserved ${envVars.ZROK_TOKEN} --headless`,
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
        ...envVars,
      },
      watch: false,
      max_memory_restart: '1G',
      instances: 1,
      exec_mode: 'fork',
    },
  ],
};
