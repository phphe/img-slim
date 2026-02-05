import { getApp } from "./app";

const init = async () => {
  const app = await getApp();
  // Run the server!
  try {
    await app.listen({
      port: process.env.PORT || 8092,
      host: process.env.HOST || "0.0.0.0",
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

init();
