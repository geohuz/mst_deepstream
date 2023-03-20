import { dsc } from './contexts.jsx'
import { getRelativePath, getParent, getIdentifier, 
  unprotect, getChildType, applySnapshot, getRoot, destroy } from "mobx-state-tree"
import isEqual from "lodash/isequal"
// todo: 
// 1. getUid
// 2. reference
// 3. debug flag

// 后端数据同步到前端
export async function loadFromDS(node) { 
  let listName = getRelativePath(getParent(node), node)
  console.info("load listName: ", listName)
  let list = dsc.record.getList(listName)
  let snapshot = {}
  await list.whenReady()
  list.on('entry-added', async(recordName)=> {
    console.info("BackEnd list add sync to Frontend ", recordName)
    let record = dsc.record.getRecord(recordName)
    await record.whenReady()
    unprotect(getRoot(node))
    node.put(record.get())
    console.info(node.toJSON())
  })
  list.on("entry-removed", async(recordName)=> {
    console.info("BackEnd list remove sync to Frontend ", recordName)
    let xs = recordName.split('/')
    let recordId = xs[xs.length-1]
    console.log("removed record id: ", recordId)
    unprotect(getRoot(node))
    destroy(node.get(recordId))
  })

  console.info("list length: ", list.getEntries().length)
  await Promise.all(list.getEntries().map(async(item)=>{
    let rec = dsc.record.getRecord(item)
    await rec.whenReady()
    
    let recordContent= rec.get()
    // getChildType(node): User
    let keyValue = getIdentifier(getChildType(node).create(recordContent))

    snapshot[keyValue] = recordContent
    rec.subscribe(newData=> {
      let recordNode = node.get(keyValue)
      let recordNodeValue = recordNode.toJSON()
      if (!isEqual(newData, recordNodeValue)) {
        console.log("Backend record change sync to Frontend: ", newData)
        applySnapshot(recordNode, newData)
      }
    })
  }))
  //console.info("before return snapshot: ", snapshot)
  applySnapshot(node, snapshot)
}

// 前端数据同步到后端数据
export async function triggerDSUpdate(patch) {
  const pathXS = patch.path.split('/') 
  const listName = pathXS.slice(0,2).join('/')
  const recordName = pathXS.slice(0,3).join('/')
  let recordContent = {}
  let recordExist = await dsc.record.has(recordName)
  if (recordExist) {
    recordContent = dsc.record.getRecord(recordName).get()
    console.info('Memory recordContent', recordContent)
  }
  let recordIsEmpty = (Object.keys(recordContent).length==0)
  console.info(`onPatch recordName: ${recordName} listName: ${listName} recordExist: ${recordExist} recordContent: ${JSON.stringify(recordContent)}`)
  switch (patch.op) {
    case "replace":
      let field = pathXS[pathXS.length-1]
      if (recordContent[field] !== patch.value) {
        console.info("Frontend replace sync to Backend: ", patch)
        dsc.record.setData(recordName, `${field}`, patch.value)
      }
      break
    case "add":
      if (!recordExist) {
        console.info("Frontend add sync to Backend", patch)
        dsc.record.setData(recordName, patch.value)
        let listAdd = dsc.record.getList(listName)
        listAdd.whenReady(()=>listAdd.addEntry(recordName))
      }
      break
    case "remove":
      if (recordExist && recordIsEmpty) {
        console.info("Frontend delete sync to Backend: ", patch)
        let listRemove = dsc.record.getList(listName)
        listRemove.whenReady(()=>listRemove.removeEntry(recordName))
        let removeRecord = dsc.record.getRecord(recordName)
        removeRecord.whenReady(rec=> {
          rec.delete()
          rec.discard()
        })
      }
      break
  }
}