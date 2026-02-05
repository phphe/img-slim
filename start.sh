# quick start or stop
# update
git pull
# build
pnpm run build
# start
pm2 start dist/index.js --name img-slim -i max
