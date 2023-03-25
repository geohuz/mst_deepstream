// 检查是否有listProperties
// 不需要做这个, 应该是Mst需要处理
let listPropertyRecordName = `${listName}/listProperties` 
let listProperties = Object.assign({}, currentRecords.get(listPropertyRecordName))
let pathParts = splitJsonPath(patch.path)
let assumedValue = pathParts[pathParts.length-1]
Object.entries(listProperties).map(([key, value]) => {
  if (value ===  assumedValue) {
    listProperties[key] = null
  }
})
if (!isEqual(listProperties, currentRecords.get(listPropertyRecordName))) {
  console.log("modified listProperties", listProperties)
  currentRecords.set(listPropertyRecordName, listProperties)
  //!!! 当前节点情况不会apply这个patch!(难道是bug?)
  applyListPropertyPatch(treeNode, listProperties)
  let rec= dsc.record.getRecord(listPropertyRecordName)
  await rec.whenReady()
  dsc.record.setData(listPropertyRecordName, listProperties)
}