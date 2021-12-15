const env = process.env.NODE_ENV || "production";
const debug = env === "development";
console.log(`Current env: ${env}, debug: ${debug}`);

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
  // to separate multiple services
  services: {
    aws_s3: {
      urlPrefix: "", // unique. Can be modified
      idName: "aws_s3", // machine name. unique. Do not modify after created
    },
  },
};
