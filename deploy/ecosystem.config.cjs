// PM2 process definition for the production server (see deploy/update.sh).
// A single instance on purpose: the built-in refresh scheduler must run in
// exactly one process, or IPO data would be refreshed several times over.
module.exports = {
  apps: [
    {
      name: "iponexa",
      cwd: __dirname + "/..",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000 -H 127.0.0.1",
      instances: 1,
      exec_mode: "fork",
      env: { NODE_ENV: "production" },
      max_memory_restart: "900M",
      time: true,
    },
  ],
};
