import {DeepstreamClient} from '@deepstream/client'

const dsc = new DeepstreamClient('localhost:6020/deepstream')

async function main() {
  await dsc.login({username: "userA", password: "password"})
  let record = dsc.record.getRecord('users/abc-123')
  await record.whenReady()
  record.set({
    firstname: "vicky",
    lastname: "hu"
  })
}

main()
