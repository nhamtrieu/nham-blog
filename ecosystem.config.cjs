const path = require("path");

module.exports = {
  apps: [
    {
      name: "nham-blog",
      cwd: path.join(__dirname),
      script: "npm",
      args: "start",
      interpreter: "none",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      max_memory_restart: "512M",
      time: true,
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
