import {useEffect} from 'react'
import { root } from './store'
import { observer } from 'mobx-react-lite'
import {values} from 'mobx'
function App() {
  console.log('App3: ', root.userStore.users.toJSON())
  function handleChange() {
      console.log("after click", root.toJSON())
      root.userStore.users.get("new2").setFirstName("ohGodMEBlahbla!")
      //root.userStore.delete("new2")
      //root.userStore.add("newBiBili", "lalal", "hu")
      console.log("final data: ", root.toJSON())
      //u.add('mqt', 'push', 'it')
      //u.delete('mqt')
  }
  return (
    <>
      <div>Testing</div>
      <button onClick={handleChange}>Change It!</button>
      <>
        {values(root.userStore.users).map(item=> 
          <div>
          <span>id: {item.id}</span> || 
          <span>firstname: {item.firstname}</span> ||
          <span>lastanme: {item.lastname}</span> ||
          </div>
        )}
      </>
    </>
  )
}

export default observer(App)

    /*
   */
