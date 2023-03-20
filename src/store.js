import { types, flow, onPatch, destroy } from 'mobx-state-tree'
import {remove} from 'mobx'
import { loadFromDS, triggerDSUpdate } from './deepstreamOp.js'

const User = 
  types.model({
    id: types.identifier,
    firstname: types.string,
    lastname: types.string,
  })
  .actions(self=> ({
    setFirstName(value) {
      self.firstname = value
    }
  }))

const UserStore = types
  .model({
    users: types.map(User)
  })
  .actions(self=> ({
    add(id, firstname, lastname) {
      self.users.put({id, firstname, lastname})
    },
    delete(id) {
      remove(self.users, id)
    },
    load: flow(function* load() {
      yield loadFromDS(self.users)
    }),
  }))

const RootStore = types
  .model({
    userStore: types.optional(UserStore, {users: {}})
  })
  .actions(self=> ({
    afterCreate() {
      self.userStore.load()
    }
  }))

export const root = RootStore.create({})

onPatch(root.userStore, patch=>triggerDSUpdate(patch))

