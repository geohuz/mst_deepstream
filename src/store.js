import { types, flow, onPatch, destroy, getParent, getRoot } from 'mobx-state-tree'
import {remove} from 'mobx'
import { loadFromDS, triggerDSUpdate } from './mst-deepstream-syncer.js'
import {dsc} from './contexts'
import {values} from 'mobx'

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
      getParent(self, 2).remove(self)
    }
  }))
  .views(self=> ({
    userTodos() {
      return values(getRoot(self).
              todoStore.todos).
                filter(todo=>todo.user===self)
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
    remove(user) {
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
    user: types.maybe(types.reference(types.late(()=>User)))
  })
  .actions(self=> ({
    setUser(user) {               // identifer or a user model instance
      if (user==="") {
        self.user = undefined
      } else {
        self.user = user
      }
      //self.user.addUserTodo(self) // 这里怎么搞
    },
    setName(value) {
      self.name = value
    },
    remove() {
      // 必须绕到parent操作
      getParent(self, 2).remove(self)
    }
  }))

const TodoStore = types
  .model({
    todos: types.map(Todo)
  })
  .actions(self=> ({
    add(name, done) {
      let id = dsc.getUid()
      self.todos.put({id, name, done})
    },
    remove(todo) {
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
      //self.todoStore.load()
    }
  }))

export const root = RootStore.create({})

onPatch(root.userStore, patch=>{
  triggerDSUpdate(root.userStore.users, patch)
})

onPatch(root.todoStore, patch=> {
  triggerDSUpdate(root.todoStore.todos, patch)
})

