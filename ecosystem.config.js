module.exports = {
  apps: [
    {
      name: 'omni-social-backend',
      script: 'electron/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env_production: {
        NODE_ENV: 'production',
        API_PORT: 3777,
        // SQLite — đơn giản, không cần PostgreSQL server
        DATABASE_URL: 'file:/www/wwwroot/omni-backend/data/social-manager.db',
        DATABASE_PATH: '/www/wwwroot/omni-backend/data/social-manager.db',
        // Bảo mật — thay đổi sau khi deploy
        JWT_SECRET: 'omni_jwt_super_secret_2024_change_me',
        ENCRYPTION_KEY: 'omni_aes256_key_32chars_changeme!'
      }
    }
  ]
};
