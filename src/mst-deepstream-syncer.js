// todo: 
// 操作回滚?
// 前端数据intersection observer?
// every record should have removeListener/attachListener
// then user use it in the observer

import {diff} from 'jiff'
import { dsc } from './contexts.jsx'
import { getRelativePath, getParent, getIdentifier, 
  unprotect, getChildType, applySnapshot, getRoot, destroy, applyPatch, getSnapshot, getPath, splitJsonPath, onPatch } from "mobx-state-tree"
import isEqual from "lodash/isequal"

// 记录缓存
const currentRecords = new Map()
const recordHandlers = new Map()
let patchListeners = []
let dsListeners = []

// 它端生成记录缓存管理器
const attachRecord = async(recordName, applyCreate, applyUpdate) => {
  // 如果缓存没有
  if (!currentRecords.get(recordName)) {
    // DS新建记录
    let recordHandler = dsc.record.getRecord(recordName)
    await recordHandler.whenReady()
    currentRecords.set(recordName, recordHandler.get())
    // 订阅更新
    recordHandler.subscribe(async(newData)=> {
      if (!isEqual(currentRecords.get(recordName), newData)) {
        currentRecords.set(recordName, newData)
        // 更新数据发给回调处理
        applyUpdate(newData)
      }
    })
    recordHandlers.set(recordName, recordHandler)
    // 新建数据发给回调处理
    applyCreate(currentRecords.get(recordName))
  } 
}

// 本端生成记录缓存管理器
const attachRecordFront = async(recordName, recordContent, 
  applyCreate, applyChange, applyExisted) => {
  let memoryContent = currentRecords.get(recordName)
  if (!currentRecords.get(recordName)) {
    currentRecords.set(recordName, recordContent)
    let recordHandler = dsc.record.getRecord(recordName)
    await recordHandler.whenReady()
    recordHandler.set(recordContent) // 新增记录
    recordHandler.subscribe(async(newData)=> {
      // 收到它端数据变化
      if (!isEqual(memoryContent, newData)) {
        currentRecords.set(recordName, newData)
        applyChange(newData)
      }
    })
    recordHandlers.set(recordName, recordHandler)
    applyCreate() // 新记录给到回调处理
  } else {
    if (!isEqual(memoryContent, recordContent)) {
      // 如果已经有这条记录且内容有变化
      // 让回调处理变化, 返回值更新缓存
      applyExisted(memoryContent)
    }
  }
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

function applyListPropertyPatch(node, data) {
  Object.entries(data).map(([key, value])=> {
    /*
    字段级别修改使用applyPatch
    /recordName/listProperties { selectedTodo: 'lfmj1cnh-9ox8vuix9t4' }
    */
    applyPatch(getParent(node, 1), {op: "replace", path: `/${key}`, value: value})
  })
}

// 启动首次获得DS数据
export async function DSLoader(node, listProvider=undefined) { 
  let snapshot = {}
  let initialListData = []
  let list
  const listName = getRelativePath(getParent(node), node)
  console.info("load listName: ", listName)

  list = dsc.record.getList(listName)
  await list.whenReady()

  if (listProvider!==undefined) {
    initialListData = await listProvider()
  } else {
    initialListData = list.getEntries()
  }
  
  // list 它端添加侦听
  list.on('entry-added', async(recordName)=> {
    console.info("BackEnd list add sync to Frontend ", recordName)
    await attachRecord(recordName, 
      newData=>{
        if (recordName.includes('listProperties')) {
          applyListPropertyPatch(node, newData)
        } else {
          unprotect(getRoot(node))
          node.put(newData)
        }
      },
      changedData=>{
        if (recordName.includes("listProperties")) {
          applyListPropertyPatch(node, changedData)
        } else {
          // getChildType (node: todos/users)
          // child: user 
          let idValue = getIdentifier(getChildType(node).create(changedData))
          let recordNode = node.get(idValue)
          applySnapshot(recordNode, changedData)
        }
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
  await Promise.all(initialListData.map(async(item)=>{
    await attachRecord(item,
      newData=> {
        // root property
        if (item.includes("listProperties")) {
          applyListPropertyPatch(node, newData)
        } else {
          let idValue = getIdentifier(getChildType(node).create(newData))
          snapshot[idValue] = newData
        }
      },
      changedData=> {
        if (item.includes("listProperties")) {
          applyListPropertyPatch(node, changedData)
        } else {
          let idValue = getIdentifier(getChildType(node).create(changedData))
          let recordNode = node.get(idValue)
          applySnapshot(recordNode, changedData)
        }
      }
    )
  }))
  console.info("before return snapshot: ", snapshot)
  applySnapshot(node, snapshot)

  return { 
    list: list
  } 
}

// 本端数据生成
export async function triggerDSUpdate(treeNode, patch) {
  console.log("entering patch -----------------------")
  console.log("getPath: ", getPath(treeNode))
  console.log("getParentPath: ", getPath(getParent(treeNode)))
  let listName = getRelativePath(getParent(treeNode), treeNode)
  console.log("patch content: ", patch)
  console.log("split json path: ", splitJsonPath(patch.path))
  console.log("listName:xxxxxxxxxxxxxxxxx", listName)
  let snapshotLeaf = Object.values(getSnapshot(treeNode))[0]
  const pathXS = patch.path.split('/') 
  // 根上的操作
  let pathparts = splitJsonPath(patch.path)
  const recordName = pathXS.slice(0,3).join('/')
  console.log("recordName: ", recordName)
  let list = dsc.record.getList(listName)
  switch (patch.op) {
    case "replace":
      if (pathparts.length===1) {
        // listProperty
        let recordName = `${listName}/listProperties`
        let recordContent = {[pathparts[0]]: patch.value}
        await attachRecordFront(recordName, recordContent, 
          ()=> {
            console.log("listProperty is initiated from op.replace", listName)
            list.whenReady(()=>{list.addEntry(recordName)})
          },
          (othersData)=> {
            // 收到它端数据变化
            console.log("get listProperty change from others", othersData)
            applyListPropertyPatch(treeNode, othersData)
          },
          (memoryContent)=>{
            console.log("local applied a change to the listProperty", memoryContent, patch.value)
            // 必须先更新缓存!!
            let newRecordData = Object.assign({}, memoryContent, {[pathparts[0]]: patch.value})
            currentRecords.set(recordName, newRecordData)
            // 更新DS
            let value = patch.value===undefined? null : patch.value
            dsc.record.setData(recordName, `${pathparts[0]}`, value)
          }
        )
      } else {
        let field = pathXS[pathXS.length-1]
        if (currentRecords.get(recordName)[field] !== patch.value) {
          // 更新缓存(因为不是attchedRecordFront)
          currentRecords.set(recordName, snapshotLeaf) 
          console.info("Frontend replace sync to Backend: ", `recordName: ${recordName} field: ${field} value: ${JSON.stringify(patch.value)}`)
          dsc.record.setData(recordName, `${field}`, patch.value)
        }
      }
      break
    case "add":
      console.log("add patch", patch)
      await attachRecordFront(recordName, patch.value,
        ()=> {
          console.log("create new data from front", listName)
          list.whenReady(()=>{list.addEntry(recordName)})
        },
        (newData)=> {
          console.log('get change from others')
          let idValue = getIdentifier(getChildType(treeNode).create(newData))
          let recordNode = treeNode.get(idValue)
          applySnapshot(recordNode, newData)
        },
        (memoryData)=> {
          console.log("memory data: ", memoryData)
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
              // 本端的修改更新到缓存
              currentRecords.set(recordName, snapshotLeaf) 
              dsc.record.setData(recordName, `${field}.${key}`, patch.value)
            }
          }
        })
      break
    case "remove":
      // remove 指令没有value, 只有path. 把recordName从path string
      // 前部移除, 如果不为空则为移除的具体子属性, 否则就是删掉整条记录
      // bug: remove apply patch
      let removePath = patch.path.replace(recordName, "")
      if (removePath!=="") {
        let [_, field, key] = removePath.split('/')
        console.info('field and key: ', field,  key)
        // 更新缓存因为不是attachedRecordFront
        currentRecords.set(recordName, snapshotLeaf)
        // record子属性remove
        dsc.record.setData(recordName, `${field}.${key}`, undefined)
      } else {
        await deleteRecord(recordName, (recordName)=> {
          console.info("Frontend delete sync to Backend: ", patch)
          list.whenReady(()=> list.removeEntry(recordName))
        })
      }
      break
  }
}

/*
storeInfo:
  { item.store: todoStore, 
    collection: todos, 
  }
*/
export async function DSSyncRunner(storeInfo, 
  listProvider, withPatchListener=true) 
{
  function dispose() {
    // 最高级别清理
    (patchListeners.length!==0) && patchListeners.map(disposer=>disposer())
    (dsListeners.length!==0) && dsListeners.map(item=>{
      item.list.discard()
      item.list.callbacks.clear()
    })
    dsListeners = []
    patchListeners = []
    
    currentRecords.clear()
    recordHandlers.forEach(value=>value.discard())
    recordHandlers.clear()
  }

  // 先清理
  dispose()

  const dsDisposer = await DSLoader(storeInfo.collection, 
                            listProvider) 
  dsListeners.push(dsDisposer)

  // 添加监听
  if (withPatchListener) {
    const patchDisposer = onPatch(storeInfo.store, patch=> {
      triggerDSUpdate(storeInfo.collection, patch)
    })
    patchListeners.push(patchDisposer)
  }
  return dispose
}