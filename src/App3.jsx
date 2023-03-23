import {useEffect, useRef, useState} from 'react'
import { root } from './store'
import { observer } from 'mobx-react-lite'
import {values} from 'mobx'

function App() {
  useEffect(()=> {
    //console.log(root.todoStore.toJSON())
    //root.todoStore.add("brew the coffee", false)
    root.todoStore.load()
  }, [])
  function handleAddUser() {
    console.log("after click", root.userStore.toJSON())
    //root.userStore.users.get("new2").setFirstName("ohGodMEBlahbla!")
    //root.userStore.delete("new2")
    root.userStore.add("lalala", "hu")
    //u.add('mqt', 'push', 'it')
    //u.delete('mqt')
  }
  function handleAddTodo() {
    console.log("after click", root.todoStore.toJSON())
    //root.userStore.users.get("new2").setFirstName("ohGodMEBlahbla!")
    //root.userStore.delete("new2")
    root.todoStore.add("brew bear", false)
    //u.add('mqt', 'push', 'it')
    //u.delete('mqt')
  }
  
  return (
    <>
      <h1> Todo Manager </h1>
      <button onClick={handleAddUser}>Add User</button>
      <button onClick={handleAddTodo}>Add Todo</button>
      <h2>Users</h2>
      <>
        {values(root.userStore.users).map(item=> 
          <div key={item.id}>
            <User item={item} />
          </div>
        )}
      </>
      <h2>Todos</h2>
      <>
        {values(root.todoStore.todos).map(item=> 
          <div key={item.id}>
            <Todo item={item} />
          </div>
        )}
      </>
    </>
  )
}

const User = observer(({item}) => {
  const inputFirstName = useRef(null)
  const inputLastName = useRef(null)

  return (
    <>
      <span>firstname: {item.firstname}</span> <input type="text" ref={inputFirstName} /> <button onClick={()=>item.setFirstName(inputFirstName.current.value)}>change</button> <button onClick={()=>item.remove()}>delete</button>

      <span>lastanme: {item.lastname}</span> <input type="text" ref={inputLastName} /> <button onClick={()=>item.setLastName(inputLastName.current.value)}>change</button>

      <h3> user todos </h3>
      {item.userTodos().map(item=>
        <div key={item.id}>
          <Todo item={item} />
        </div>
      )} 
    </>
  )
})


const Todo = observer(({item}) => {
  const inputName = useRef(null)

  return (
    <>
      <span>name: {item.name}</span> <input type="text" ref={inputName} /> <button onClick={()=>item.setName(inputName.current.value)}>change</button> <button onClick={()=>item.remove()}>delete</button>
      <UserPicker
        user={item.user} 
        store={root.userStore}
        onChange={userId=>item.addUser(userId)}
      />
    </>
  )
})

const UserPicker = observer(props => (
  <select value={props.user ? props.user.id : ""} onChange={e => props.onChange(e.target.value)}>
      <option value="">-none-</option>
      {values(props.store.users).map(user => (
          <option key={user.id} value={user.id}>{user.firstname}</option>
      ))}
  </select>
))


export default observer(App)

