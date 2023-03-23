import { types } from "mobx-state-tree";

const User = types.model({
  id: types.identifier,
  name: types.string,
  groups: types.array(types.reference(() => Group)),
});

const Group = types.model({
  id: types.identifier,
  name: types.string,
  members: types.array(types.reference(() => User)),
});

const RootStore = types.model({
  users: types.map(User),
  groups: types.map(Group),
}).actions((self) => ({
  addUser(user) {
    self.users.put(user);
  },
  addGroup(group) {
    self.groups.put(group);
  },
}));

const store = RootStore.create({
  users: {},
  groups: {},
});


store.users.addUser({id: "abc", name:"gerogehu"})
