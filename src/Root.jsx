import {useDsClient} from './contexts.jsx'
import { useEffect } from 'react'
import App from './App6.jsx'
import { observer } from 'mobx-react-lite'

function Root() {
  const dsc = useDsClient()
  useEffect(()=> {
    async function prep() {
      await dsc.login(
        {username: "userA", password: "password"}
      )
    }
    prep()
  })

  return (
    <App />
  )
}

export default observer(Root)
