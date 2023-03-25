import {useEffect, useRef, useState} from 'react'
import { root } from './store1'
import { observer } from 'mobx-react-lite'
import {values} from 'mobx'
import aStore  from './generalLoader'

const App = observer(() => {
  function handleAddTodo() {
    root.todoStore.add("brew bear", false)
  }
  const loader = useRef(null)
  useEffect(()=> {
    async function fetch() {
      loader.current = await aStore.load()
    }
    fetch()
  }, [])
  
  return (
    <>
      <h1> Todo Manager </h1>
      <button onClick={()=>console.log(root.toJSON())}>check store</button>
      <button onClick={()=>loader.current.previous()}>previous</button>
      <button onClick={()=>loader.current.next()}>next</button>
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
      <span>select</span>
      <input type="checkbox" 
        checked={item.selected}
        onChange={()=>{
          item.switchSelect()
        }}
      />
    </>
  )
})

export default App