import * as React from 'react'
import { DeepstreamClient } from '@deepstream/client/dist/bundle/ds.min.js' 

const Context = React.createContext()

export default function createDeepstreamClientProvider(deepstreamClient) {
  const DeepstreamClientProvider = (props) => {
    const dsc = React.useRef(null)
    if (!dsc.current) {
      dsc.current = deepstreamClient
    }
    return <Context.Provider value={dsc.current}>{props.children}</Context.Provider>
  }
  const useDsClient = () => {
    const dsc = React.useContext(Context)
    if (!dsc) {
      throw new Error('No Deepstream client set, use DeepstreamClientProvider to set one')
    }
    return dsc
  }
  return {
    DeepstreamClientProvider,
    useDsClient
  }
}
