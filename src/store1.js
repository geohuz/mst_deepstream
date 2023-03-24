import { types, flow, onPatch, getParent, getRoot, destroy } from "mobx-state-tree"
import { loadFromDS, triggerDSUpdate } from './mst-deepstream-syncer.js'
import {dsc} from './contexts'

const Todo = types.model({
  id: types.identifier,
  name: types.string
})
.actions(self=>({
  select() {
    getParent(self, 2).setSelect(self)
    //console.log("store content: ", getRoot(self).toJSON())
  },
  setName(value) {
    self.name = value
  },
  remove() {
    // 必须绕到parent操作
    getParent(self, 2).removeTodo(self)
  }
}))

const TodoStore = types.model({
  todos: types.map(Todo),
  // 在关系数据模型中这个是不成立的. 它不应该放在表级别
  // 但是单选怎么办? 单选只能操作去掉被选择的那个
  selectedTodo: types.maybe(types.reference(Todo))
})
.actions(self=> ({
  add(name, done) {
    let id = dsc.getUid()
    self.todos.put({id, name})
    //console.log("store content: ", getRoot(self).toJSON())
  },
  removeTodo(todo) {
    destroy(todo)
  },
  setSelect(todo) {
    self.selectedTodo = todo
  },
  load: flow(function* load() {
    yield loadFromDS(self.todos)
  })
}))

const RootStore = types
  .model({
    todoStore: types.optional(TodoStore, {})
  })
  .actions(self=> ({
    afterCreate() {
      self.todoStore.load()
    }
  }))

  export const root = RootStore.create({})

  onPatch(root.todoStore, patch=> {
    triggerDSUpdate(root.todoStore.todos, patch)
  })
  
  