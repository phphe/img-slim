import { getApp } from './app'

const init = async () => {
  const app = await getApp()
  // Run the server!
  app.listen(8092, (err, address) => {
    if (err) throw err
    console.log(`Server is now listening on ${address}`)
  })
}

init()
