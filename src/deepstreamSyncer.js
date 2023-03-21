import { dsc } from './contexts.jsx'
import { getRelativePath, getParent, getIdentifier, 
  unprotect, getChildType, applySnapshot, getRoot, destroy } from "mobx-state-tree"
import isEqual from "lodash/isequal"
// todo: 
// 1. getUid: done
// 2. reference
// 3. debug flag

// 后端数据同步到前端
export async function loadFromDS(node) { 
  let listName = getRelativePath(getParent(node), node)
  console.info("load listName: ", listName)
  let list = dsc.record.getList(listName)
  let snapshot = {}
  await list.whenReady()

  // list 它端添加删除侦听
  list.on('entry-added', async(recordName)=> {
    console.info("BackEnd list add sync to Frontend ", recordName)
    let record = dsc.record.getRecord(recordName)
    await record.whenReady()
    record.subscribe(newData=> {
      console.log("subscribed", newData )
      let idValue = getIdentifier(getChildType(node).create(newData))
      applySubscribedData(newData, node, idValue)
    })
    unprotect(getRoot(node))
    let recordContent = record.get()
    node.put(recordContent)
    // 它端list新加入记录的修改侦听
  })
  // list 它端删除侦听
  list.on("entry-removed", async(recordName)=> {
    console.info("BackEnd list remove sync to Frontend ", recordName)
    let xs = recordName.split('/')
    let recordId = xs[xs.length-1]
    console.log("removed record id: ", recordId)
    unprotect(getRoot(node))
    destroy(node.get(recordId))
    //remove(node, recordId)
  })
  console.info("list length: ", list.getEntries().length)
  // 首次同步
  await Promise.all(list.getEntries().map(async(item)=>{
    let rec = dsc.record.getRecord(item)
    await rec.whenReady()
    
    let recordContent = rec.get()
    console.log("recordCOntent", recordContent)
    // getChildType(node): User
    let idValue = getIdentifier(getChildType(node).create(recordContent))
    snapshot[idValue] = recordContent

    // 首次加入记录的它端修改侦听
    rec.subscribe(newData=> {
      idValue = getIdentifier(getChildType(node).create(newData))
      applySubscribedData(newData, node, idValue)
    })
  }))
  console.info("before return snapshot: ", snapshot)
  applySnapshot(node, snapshot)
}

function applySubscribedData(data, node, idValue) {
  console.log("entering applySubscribedData")
  let recordNode = node.get(idValue)
  let recordNodeValue = recordNode.toJSON()
  if (!isEqual(data, recordNodeValue)) {
    console.log("Backend record sync to Frontend: ", data)
    applySnapshot(recordNode, data)
  }
}

// 前端数据同步到后端数据
export async function triggerDSUpdate(treeNode, patch) {
  const pathXS = patch.path.split('/') 
  const listName = pathXS.slice(0,2).join('/')
  const recordName = pathXS.slice(0,3).join('/')
  let localRecordContent = {}
  let localRecordExist = await dsc.record.has(recordName)
  if (localRecordExist) {
    localRecordContent = dsc.record.getRecord(recordName).get()
    console.info('Local Memory RecordContent', localRecordContent)
  } 
  let localRecordIsEmpty = (Object.keys(localRecordContent).length==0)
  console.info(`onPatch recordName: ${recordName} listName: ${listName} localRecordExist: ${localRecordExist} localRecordContent: ${JSON.stringify(localRecordContent)} localRecordIsEmpty: ${localRecordIsEmpty}`)
  switch (patch.op) {
    case "replace":
      let field = pathXS[pathXS.length-1]
      if (localRecordContent[field] !== patch.value) {
        console.info("Frontend replace sync to Backend: ", patch)
        dsc.record.setData(recordName, `${field}`, patch.value)
      }
      break
    case "add":
      // 本端没有记录
      if (!localRecordExist) {
        console.info("Frontend add sync to Backend", patch)
        let record = dsc.record.getRecord(recordName)
        await record.whenReady()
        record.set(patch.value)
        // 本端加入记录的它端修改侦听
        record.subscribe(newData=>{
          let idValue = getIdentifier(getChildType(treeNode).create(newData))
          applySubscribedData(newData, treeNode, idValue)
        })
        let list = dsc.record.getList(listName)
        list.whenReady(()=>{
          list.addEntry(recordName)
        })
      }
      break
    case "remove":
      if (localRecordExist) {
        console.info("Frontend delete sync to Backend: ", patch)
        let list = dsc.record.getList(listName)
        list.whenReady(()=>list.removeEntry(recordName))
        let record = dsc.record.getRecord(recordName)
        record.whenReady(rec=> {
          //rec.discard()
          rec.delete()
        })
      }
      break
  }
}