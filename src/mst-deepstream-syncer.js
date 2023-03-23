import {patch, diff} from 'jiff'
import { dsc } from './contexts.jsx'
import { getRelativePath, getParent, getIdentifier, 
  unprotect, getChildType, applySnapshot, getRoot, destroy, getPathParts, resolvePath, getPath, tryResolve, isModelType, getType, getMembers, getSnapshot } from "mobx-state-tree"

import isEqual from "lodash/isequal"
// todo: 
// 1. getUid: done
// 2. reference: example done

// 本地记录缓存
// 本地记录操作
const currentRecords = new Map()
const getRecord = async(recordName, applyData) => {
  if (!currentRecords.get(recordName)) {
    let recordHandler = dsc.record.getRecord(recordName)
    await recordHandler.whenReady()
    currentRecords.set(recordName, recordHandler.get())
    recordHandler.subscribe(async(newData)=> {
      if (!isEqual(currentRecords.get(recordName), newData)) {
        currentRecords.set(recordName, newData)
        applyData(newData)
      }
    })
  } else {
    applyData(currentRecords.get(recordName))
  } 
}

const discardRecord = (recordName) => {
  const record = getRecord(recordName)
  record.discard()
  currentRecords.delete(recordName)
}
const deleteRecord = (recordName) => {
  const record = getRecord(recordName)
  record.delete()
  currentRecords.delete(recordName)
}

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
    record.subscribe(async(newData)=> {
      let localRecord = currentRecords.get(recordName) // 先查缓存
      if (!isEqual(localRecord, newData)) {
        currentRecords.set(recordName, newData) // don't forget to update the cache!
        let idValue = getIdentifier(getChildType(node).create(newData))
        applySubscribedData(newData, node, idValue)
      }
    })
    if (!currentRecords.get(recordName)) {
      const rec = record.get()
      currentRecords.set(recordName, rec)  // dont' forget to update the cache!
      unprotect(getRoot(node))
      node.put(rec)
    }
  })
  // list 它端删除侦听
  list.on("entry-removed", async(recordName)=> {
    if (currentRecords.get(recordName)) {
      console.info("BackEnd list remove sync to Frontend ", recordName)
      let xs = recordName.split('/')
      let recordId = xs[xs.length-1]
      console.log("removed record id: ", recordId)
      unprotect(getRoot(node))
      destroy(node.get(recordId))
      currentRecords.delete(recordName)
    }
  })
  console.info("list length: ", list.getEntries().length)
  // 首次同步
  await Promise.all(list.getEntries().map(async(item)=>{
    let rec = dsc.record.getRecord(item)
    await rec.whenReady()
    
    let recordContent = rec.get()
    currentRecords.set(item, recordContent)
    // getChildType(node): User
    let idValue = getIdentifier(getChildType(node).create(recordContent))
    snapshot[idValue] = recordContent

    // 首次加入记录的它端修改侦听
    rec.subscribe(newData=> {
      let localRecord = currentRecords.get(item) 
      if (!isEqual(localRecord, newData)) {
        currentRecords.set(item, newData)   // 更新缓存
        idValue = getIdentifier(getChildType(node).create(newData))
        applySubscribedData(newData, node, idValue)
      }
    })
  }))
  console.info("before return snapshot: ", snapshot)
  applySnapshot(node, snapshot)
}

function applySubscribedData(data, node, idValue) {
  console.log("entering applySubscribedData")
  //let recordNode = node.get(idValue)
  //let recordNodeValue = recordNode.toJSON()
  //if (!isEqual(data, recordNodeValue)) {
    console.log("Backend record sync to Frontend: ", data)
    applySnapshot(recordNode, data)
  //}
}

// 前端数据同步到后端数据
export async function triggerDSUpdate(treeNode, patch) {
  let relativePath = getRelativePath(getParent(treeNode), treeNode)
  let snapshotLeaf = Object.values(getSnapshot(treeNode))[0]
  let ln = relativePath.split('/')[1]
  console.log(relativePath, ln)
  //console.info("tryResolve: ", getChildType(getParent(tryResolve(getParent(treeNode), patch.path))))
  //console.info("resolve Path: ", getParent(resolvePath(getParent(treeNode), patch.path)))
  const pathXS = patch.path.split('/') 
  const listName = pathXS.slice(0,2).join('/')
  const recordName = pathXS.slice(0,3).join('/')
  let localRecordContent = currentRecords.get(recordName)
  //let localRecordExist = await dsc.record.has(recordName)
  //if (localRecordExist) {
  //  localRecordContent = dsc.record.getRecord(recordName).get()
  //} 
  //let localRecordIsEmpty = (Object.keys(localRecordContent).length==0)
  console.info(`onPatch: `, patch)
  //console.info(`local record: recordName: ${recordName}  localRecordContent: ${JSON.stringify(localRecordContent)}`)
  switch (patch.op) {
    case "replace":
      // todo: not euqal to local then replace
      let field = pathXS[pathXS.length-1]
      //if (localRecordContent[field] !== patch.value) {
        console.info("Frontend replace sync to Backend: ", `recordName: ${recordName} field: ${field} value: ${JSON.stringify(patch.value)}`)
        dsc.record.setData(recordName, `${field}`, patch.value)
      //}
      break
    case "add":
      // 本端内存record记录和patch.value不一样
      if (localRecordContent) {
          console.info("Frontend add sync to Backend: ", `recordName: ${recordName} value: ${JSON.stringify(patch.value)}`)
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
      } else {
        if (!isEqual(patch.value, localRecordContent)) {
          // 如果localRecordContent为空则向后端添加一条记录
            // record子属性add
            // todo: 只处理了map(不过建议用map) 还需array处理
            console.info("snapshotLeaf", snapshotLeaf)
            console.info("localRecordContent", localRecordContent)
            let newPatch = diff(localRecordContent, snapshotLeaf)
            console.info("new patch: ", newPatch[0])
            let [_, field, key] = newPatch[0].path.split('/')
            console.info('field and key: ', field,  key)
            dsc.record.setData(recordName, field, {[key]: patch.value})
        }
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