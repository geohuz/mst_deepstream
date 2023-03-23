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
const attachRecord = async(recordName, applyCreate, applyChange) => {
  // 如果缓存没有
  if (!currentRecords.get(recordName)) {
    let recordHandler = dsc.record.getRecord(recordName)
    await recordHandler.whenReady()
    currentRecords.set(recordName, recordHandler.get())
    recordHandler.subscribe(async(newData)=> {
      if (!isEqual(currentRecords.get(recordName), newData)) {
        currentRecords.set(recordName, newData)
        applyChange(newData)
      }
    })
    applyCreate(currentRecords.get(recordName))
  } 
}

const attachRecordFront = async(recordName, recordContent, 
  applyCreate, applyChange, applyExistedRecord) => {
  if (!currentRecords.get(recordName)) {
    currentRecords.set(recordName, recordContent)
    let recordHandler = dsc.record.getRecord(recordName)
    await recordHandler.whenReady()
    recordHandler.set(recordContent) // 新增记录
    recordHandler.subscribe(async(newData)=> {
      // 后续记录变化
      if (!isEqual(currentRecords.get(recordName), newData)) {
        currentRecords.set(recordName, newData)
        applyChange(newData)
      }
    })
    applyCreate() // 新记录
  } else {
    // 如果已经有这条记录, 则返回去让前端处理
    applyExistedRecord(currentRecords.get(recordName))
  }
}

const discardRecord = (recordName) => {
  const record = getRecord(recordName)
  record.discard()
  currentRecords.delete(recordName)
}
const deleteRecord = async(recordName, applyDelete) => {
  if (currentRecords.get(recordName)) {
    let serverRecordExist = await dsc.record.has(recordName)
    if (serverRecordExist) {
      let record = dsc.record.getRecord(recordName)
      await record.whenReady()
      record.discard()
      record.delete() 
      currentRecords.delete(recordName)
      applyDelete(recordName)
    }
  }
}

// 后端数据同步到前端
export async function loadFromDS(node) { 
  let listName = getRelativePath(getParent(node), node)
  console.info("load listName: ", listName)
  let list = dsc.record.getList(listName)
  let snapshot = {}
  await list.whenReady()

  // list 它端添加侦听
  list.on('entry-added', async(recordName)=> {
    console.info("BackEnd list add sync to Frontend ", recordName)
    await attachRecord(recordName, 
      newData=>{
        unprotect(getRoot(node))
        node.put(newData)
      },
      changedData=>{
        let idValue = getIdentifier(getChildType(node).create(changedData))
        let recordNode = node.get(idValue)
        applySnapshot(recordNode, changedData)
      }
    )
  })
  // list 它端删除侦听
  list.on("entry-removed", async(recordName)=> {
    console.info("BackEnd list remove sync to Frontend ", recordName)
    await deleteRecord(recordName, ()=> {
      let xs = recordName.split('/')
      let recordId = xs[xs.length-1]
      unprotect(getRoot(node))
      destroy(node.get(recordId))
      console.log("removed record id: ", recordId)
    })
  })
  console.info("list length: ", list.getEntries().length)
  // 首次同步
  await Promise.all(list.getEntries().map(async(item)=>{
    await attachRecord(item,
      newData=> {
        let idValue = getIdentifier(getChildType(node).create(newData))
        snapshot[idValue] = newData
      },
      changedData=> {
        let idValue = getIdentifier(getChildType(node).create(changedData))
        let recordNode = node.get(idValue)
        applySnapshot(recordNode, changedData)
      }
    )
  }))
  console.info("before return snapshot: ", snapshot)
  applySnapshot(node, snapshot)
}

// 前端数据同步到后端数据
export async function triggerDSUpdate(treeNode, patch) {
  let listName = getRelativePath(getParent(treeNode), treeNode)
  let snapshotLeaf = Object.values(getSnapshot(treeNode))[0]
  const pathXS = patch.path.split('/') 
  const recordName = pathXS.slice(0,3).join('/')
  switch (patch.op) {
    case "replace":
      let field = pathXS[pathXS.length-1]
      if (currentRecords.get(recordName)[field] !== patch.value) {
        console.info("Frontend replace sync to Backend: ", `recordName: ${recordName} field: ${field} value: ${JSON.stringify(patch.value)}`)
        dsc.record.setData(recordName, `${field}`, patch.value)
      }
      break
    case "add":
      console.log("patch", patch)
      await attachRecordFront(recordName, patch.value,
        ()=> {
          console.log("create new data from front", listName)
          let list = dsc.record.getList(listName)
          list.whenReady(()=>{list.addEntry(recordName)})
        },
        (newData)=> {
          console.log('get change from others')
          let idValue = getIdentifier(getChildType(treeNode).create(newData))
          let recordNode = treeNode.get(idValue)
          applySnapshot(recordNode, newData)
        },
        (memoryData)=> {
          console.log("memory data!", memoryData)
          if (!isEqual(patch.value, memoryData)) {
            // record子属性add
            // todo: 只处理了map(不过建议用map) 还需array处理
            console.info("snapshotLeaf", snapshotLeaf)
            console.info("localRecordContent", memoryData)
            let newPatch = diff(memoryData, snapshotLeaf)[0]
            console.info("new patch: ", newPatch)
            // 只有发起端才会有结果, 监听端则忽略
            if (newPatch!==undefined) {
              let [_, field, key] = newPatch.path.split('/')
              console.info('field and key: ', field,  key)
              dsc.record.setData(recordName, field, {[key]: patch.value})
            }
          }
        })
      break
    case "remove":
      // todo: remove sub property
      await deleteRecord(recordName, async(recordName)=> {
        console.info("Frontend delete sync to Backend: ", patch)
        let list = dsc.record.getList(listName)
        await list.whenReady()
        list.removeEntry(recordName)
      })
      break
  }
}