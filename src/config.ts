const env = process.env.NODE_ENV

export default {
  env,
  debug: env === 'development',
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    defaultRegion: process.env.AWS_DEFAULT_REGION,
    defaultBucket: process.env.AWS_DEFAULT_BUCKET,
  },
}
