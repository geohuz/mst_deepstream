import { types, flow, onPatch, getParent, getRoot, destroy } from "mobx-state-tree"
import { DSSyncRunner } from './mst-deepstream-syncer.js'
import {dsc} from './contexts'

const Todo = types.model({
  id: types.identifier,
  name: types.string
})
.actions(self=>({
  select() {
    // (self, 1): Todo, (self, 2): TodoStore 
    getParent(self, 2).setSelect(self)
  },
  setName(value) {
    self.name = value
  },
  remove() {
    // 必须绕到parent操作
    getParent(self, 2).removeTodo(self)
  }
}))
.views(self=> ({
  get selected() {
    let result = (getParent(self, 2).selectedTodo === self)
    return result
  }
}))

const TodoStore = types.model({
  todos: types.map(Todo),
})
.actions(self=> ({
  add(name, done) {
    let id = dsc.getUid()
    self.todos.put({id, name})
  },
  removeTodo(todo) {
    // 如果不是safeReference这里要手动重置 
    destroy(todo)
  },
  load: flow(function* load() {
    yield DSSyncRunner({
      store: self,
      collection: self.todos
    }, false
  )}),
}))

const RootStore = types
  .model({
    todoStore: types.optional(TodoStore, {})
  })

export const root = RootStore.create({})
