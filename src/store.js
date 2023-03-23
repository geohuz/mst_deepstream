import { types, flow, onPatch, destroy, getParent, getRoot, getMembers } from 'mobx-state-tree'
import { loadFromDS, triggerDSUpdate } from './mst-deepstream-syncer.js'
import {dsc} from './contexts'
import {values} from 'mobx'
import {remove} from 'mobx'

const User = 
  types.model({
    id: types.identifier,
    firstname: types.string,
    lastname: types.string,
  })
  .actions(self=> ({
    setFirstName(value) {
      self.firstname = value
    },
    setLastName(value) {
      self.lastname = value
    },
    remove() {
      // 必须绕到parent操作
      getParent(self, 2).removeUser(self)
    }
  }))
  .views(self=> ({          
    get userTodos() {
      let result = []
      const todos = values(getRoot(self).todoStore.todos)
      todos.map(todo=> {
        values(todo.todoUsers).map(user=> {
          if (user===self) {
            result.push(todo)
          }
        })
      })
      return result
    }
  }))

const UserStore = types
  .model({
    users: types.map(User)
  })
  .actions(self=> ({
    add(firstname, lastname) {
      let id = dsc.getUid()
      self.users.put({id, firstname, lastname})
    },
    removeUser(user) {
      destroy(user)
    },
    load: flow(function* load() {
      yield loadFromDS(self.users)
    }),
  }))

const Todo = types
  .model({
    id: types.identifier,
    name: "",
    done: false,
    todoUsers: types.map(types.maybe(types.reference(types.late(()=>User))))
  })
  .actions(self=> ({
    addUser(user) {
      if (user!=="") {
        self.todoUsers.put(getRoot(self).userStore.users.get(user))
        console.log("my todo users: ", getRoot(self).toJSON())
      }
    },
    removeUser(user) {
      remove(self.todoUsers, user)
    },
    setName(value) {
      self.name = value
    },
    remove() {
      // 必须绕到parent操作
      getParent(self, 2).removeTodo(self)
    }
  }))

const TodoStore = types
  .model({
    todos: types.optional(types.map(Todo), {})
  })
  .actions(self=> ({
    add(name, done) {
      let id = dsc.getUid()
      self.todos.put({id, name, done})
    },
    removeTodo(todo) {
      destroy(todo)
    },
    load: flow(function* load() {
      yield loadFromDS(self.todos)
    })
  }))

const RootStore = types
  .model({
    userStore: types.optional(UserStore, {users: {}}),
    todoStore: types.optional(TodoStore, {todos: {}})
  })
  .actions(self=> ({
    afterCreate() {
      self.userStore.load()
      self.todoStore.load()
    }
  }))

export const root = RootStore.create({})

onPatch(root.userStore, patch=>{
  //console.log("patch userStore: ", patch)
  triggerDSUpdate(root.userStore.users, patch)
})

onPatch(root.todoStore, patch=> {
  console.log("patch todoStore: ", patch)
  triggerDSUpdate(root.todoStore.todos, patch)
})

