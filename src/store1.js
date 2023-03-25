import { types, flow, onPatch, getParent, getRoot, destroy } from "mobx-state-tree"
import { DSLoader, triggerDSUpdate } from './mst-deepstream-syncer.js'
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
  switchSelect() {
    getParent(self, 2).switchSelect(self)
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
  // 在关系数据模型中这个是不成立的. 它不应该放在表级别
  // 但是单选怎么办? 单选只能操作去掉被选择的那个
  // safeReference 确保todo删掉后自动设置到这里(如果是选中的这里设为undefined)
  selectedTodo: types.maybeNull(types.safeReference(Todo))
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
  switchSelect(todo) {
    if (!self.selectedTodo) {
      self.selectedTodo = todo
    } else {
      self.selectedTodo = null
    }
  },
  load: flow(function* load() {
    yield DSLoader(self.todos)
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
  
  