import { types, flow, onPatch, destroy, getParent, getRoot, getMembers } from 'mobx-state-tree'

const AStore = types
  .model({
    todos: types.array(types.string)
  })
  .actions(self=> ({
    listProvider() {
      // fetching from database....
      return [1,2,3,4]
    },
    load: flow(function* load() {
      const loader = yield DSLoader(self.listProvider)
      return loader
    })
  }))


async function DSLoader(listProvider) {
  let data = listProvider()
  return {
    previous: function() {
      console.log("you are calling previous", data)
    },
    next: function() {
      console.log("you are calling next", data)
    }
  }
}

const aStore = AStore.create()
export default aStore