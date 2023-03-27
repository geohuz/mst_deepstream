import { useRef } from 'react'
import { root } from './store'
import { observer } from 'mobx-react-lite'
import {values} from 'mobx'

function App() {
  function handleAddUser() {
    root.userStore.add("temporary name", "lastname")
  }
  function handleAddTodo() {
    root.todoStore.add("brew bear", false)
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
            <User item={item} handleRemove={()=>item.remove()}/>
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

const User = observer(({item, handleRemove}) => {
  const inputFirstName = useRef(null)
  const inputLastName = useRef(null)

  return (
    <>
      <span>firstname: {item.firstname}</span> 
      <input type="text" ref={inputFirstName} /> 
      <button onClick={()=>
        item.setFirstName(inputFirstName.current.value)}>
          change 
      </button> 

      <span>lastanme: {item.lastname}</span> <input type="text" ref={inputLastName} /> <button onClick={()=>item.setLastName(inputLastName.current.value)}>change</button>

      <button onClick={()=>handleRemove(item)}>delete user</button>

      <h3> user todos </h3>
        {item.userTodos.map(item=>
          <div key={item.id}>
            <UserTodo item={item} />
          </div>
        )} 
    </>
  )
})

const UserTodo = observer(({item}) => {
  return (
    <>
      <div>task name: {item.name}</div> 
    </>
  )
})


const Todo = observer(({item}) => {
  const inputName = useRef(null)

  function handleRemoveTodoUser(id) {
    item.removeUser(id)
  }
  return (
    <>
      <span>name: {item.name}</span> 
      <input type="text" ref={inputName} /> 
      <button onClick={()=>item.setName(inputName.current.value)}>change </button> 
      <span>choose user: </span>
      <UserPicker
        store={root.userStore}
        onChange={userId=>item.addUser(userId)}
      />
      <button onClick={()=>item.remove()}>delete task</button>
      <h4> Todo Users </h4>
      {values(item.todoUsers).map(tu=> 
        <User key={tu.id} item={tu} handleRemove={()=>handleRemoveTodoUser(tu.id)} />
      )}
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

