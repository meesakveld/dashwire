export default {
  server: {
    port: Number(process.env.PORT ?? 4000),
    host: "0.0.0.0",
  },
  db: {
    client: "sqlite",
    connection: {
      filename: process.env.DASHWIRE_DB_PATH ?? "./dashwire.db",
    },
  },
};
