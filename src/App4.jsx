import {useEffect, useRef, useState} from 'react'
import { root } from './store1'
import { observer } from 'mobx-react-lite'
import {values} from 'mobx'

const App = observer(() => {
  function handleAddTodo() {
    root.todoStore.add("brew bear", false)
  }
  
  return (
    <>
      <h1> Todo Manager </h1>
      <button onClick={handleAddTodo}>Add Todo</button>

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
})

const Todo = observer(({item}) => {
  const inputName = useRef(null)

  return (
    <>
      <span>name: {item.name}</span> 
      <input type="text" ref={inputName} /> 
      <button onClick={()=>item.setName(inputName.current.value)}>change </button> 
      <button onClick={()=>item.remove()}>delete task</button>
      <span>select</span><input type="checkbox" onChange={()=>item.select()}/>
    </>
  )
})

export default App