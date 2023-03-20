import { DeepstreamClient } from '@deepstream/client/dist/bundle/ds.min.js' 
import createDeepstreamClientProvider from './deepstreamclientprovider.jsx'

export const dsc = new DeepstreamClient('localhost:6020/deepstream')
await dsc.login( {username: "userA", password: "password"})
export const {DeepstreamClientProvider, useDsClient} = createDeepstreamClientProvider(dsc)