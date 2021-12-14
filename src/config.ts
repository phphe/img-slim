const env = process.env.NODE_ENV || "production";
const debug = env === "development";

export default {
  env,
  debug,
  logFilePath: `${env}.log`,
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    defaultRegion: process.env.AWS_DEFAULT_REGION,
    defaultBucket: process.env.AWS_DEFAULT_BUCKET,
  },
};
