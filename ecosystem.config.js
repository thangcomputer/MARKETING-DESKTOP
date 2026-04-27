module.exports = {
  apps: [
    {
      name: 'omni-social-backend',
      script: 'electron/server.js', // Or the entry point to your standalone Express server
      instances: 1, // Webhooks might require sequential processing or Redis to scale > 1
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_production: {
        NODE_ENV: 'production',
        API_PORT: 3000,
        // The Postgres database URL
        DATABASE_URL: 'postgresql://omni_user:YOUR_SECURE_PASSWORD@localhost:5432/omni_db?schema=public',
        // Update these securely in your VPS
        JWT_SECRET: 'YOUR_PRODUCTION_JWT_SECRET',
        ENCRYPTION_KEY: 'YOUR_PRODUCTION_AES_256_GCM_ENCRYPTION_KEY'
      }
    }
  ]
};
