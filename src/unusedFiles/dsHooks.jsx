//todo: list should contain DSRecord as auto sense
// list it'self should be also auto sense 
// how to express record -> linked detail or list
// it's not possible: use mobx-state-tree
import {useEffect, useState, useRef} from 'react'
import { useDsClient } from './contexts.jsx'

export function useDSRecord({model, id}) {
  const dsc = useDsClient()
  const [recordData, setRecordData] = useState()

  const record_ref = useRef(null)

  // change data handler
  function updateRecord(data) {
    for (const key in data) {
      if (!(key in model)) throw Error(`The property ${key} is not in model ${model.modelName}`)
    }
    for (const key in model) {
      if (!(key in data) && key!=='modelName' && key!=='id') console.warn(`Warning: The property ${key} is not in your data, are you missing the field for update?`)
    }
    if (record_ref) {
      record_ref.current.set(data)
    }
  }

  useEffect(()=> {
    async function initSync() {
      let pathSpec = `${model.modelName}/${id}`
      let record = dsc.record.getRecord(pathSpec)
      record.on("hasProviderChanged", (hasProvider)=> {
        console.log(hasProvider)
      })
      await record.whenReady()
      record_ref.current = record
      const data = record.get()
      // populate data into frontend
      setRecordData(data)
      // subscribe changes
      record.subscribe(newData=> {
        console.log('hey there is a change', newData)
        setRecordData(newData)
      })
    }
    initSync()
  }, [model, id])
  return [recordData, updateRecord]
}

export function useDSList(listName) {
  const dsc = useDsClient()
  const [listData, setListData] = useState([])

  useEffect(()=> {
    async function initSync() {
      let list = dsc.record.getList(listName)
      await list.whenReady()
      let listEntries = list.getEntries()
      listEntries.map(async(recordName)=> {
        /*
        const record = dsc.record.getRecord(recordName)
        await record.whenReady()
        let rec = record.get()*/
        let model = recordName.split('/')[0]
        let id = recordName.split('/')[1]
        const [recordData] = useDSRecord({model, id})
        setListData(xs=> [...xs, recordData])
      })
    }
    initSync()
  }, [listName])
  return listData
}