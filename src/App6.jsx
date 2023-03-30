import {useEffect, useRef } from 'react'
import { root } from './store3'
import { observer } from 'mobx-react-lite'
import { getSnapshot } from 'mobx-state-tree'
import {snapShotDsSync} from './mst-deepstream-syncer'
import {values} from 'mobx'
//import aStore  from './generalLoader'

const App = observer(() => {
  function handleAddTodo() {
    root.todoStore.add("brew bear", false)
  }

  // 如果增加和replace不区分非常可能重复
  function handleSubmit() {
    console.info("submited")
    let kk = getSnapshot(root.todoStore.todos)
    console.info("kk", kk)
    snapShotDsSync(root.todoStore.todos, kk, "add")
  } 

  useEffect(()=> {
    let disposer
    async function fetch() {
      disposer = await root.todoStore.load()
    }
    fetch()
    return ()=>disposer()
  }, [])


  return (
    <>
      <h1> Todo Manager </h1>
      <button onClick={()=>console.log(root.toJSON())}>check store</button>
      <button onClick={handleAddTodo}>Add Todo</button>
      <button onClick={handleSubmit}>Submit</button>
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
    </>
  )
})

export default App
