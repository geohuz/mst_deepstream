import {DeepstreamClient} from '@deepstream/client'

const dsc = new DeepstreamClient('localhost:6020/deepstream')

const users = 
  [
    {recName: "users/abc-123", 
     data: {
      firstname: "george", 
      lastname: "hu",
      // abc-123 prefix might be auto created
      // one-to-many naming rule: userkey_addresses
      detail: 'users_detail/abc-123',
      addresses: 'abc-123_addresses' 
    }
    },
    {recName: "users/abc-456", 
     data: {
      firstname: "vicky", 
      lastname: "hu",
      detail: 'users_detail/abc-456',
      addresses: "abc-456_addresses"
     }
    },
  ]

const userDetails = 
  [
    {recName: "users_detail/abc-123", 
     data: {
      address: "Berlin", 
      cardNumber: "xxx-xxx-xx"}
    },
    {recName: "users_detail/abc-456", 
     data: {
      address: "Vancouver", 
      cardNumber: "ooo-oo-oo"}
    }
  ]

const billingAddress = [
  {
    recName: "addresses/1",
    data: {
      streetAddress: "123 Marienstrasse",
      city: "Berlin",
      postCode: '111232',
      country: "Germany",
    }
  },
  {
    recName: "addresses/2",
    data: {
      streetAddress: "1-2-102 XiangHuaQi",
      city: "Beijing",
      postCode: '10045',
      country: "China",
    }
  },
  {
    recName: "addresses/3",
    data: {
      streetAddress: "Jiahe Huayuan 134",
      city: "Guilin",
      postCode: '54343',
      country: "China",
    }
  },
  {
    recName: "addresses/4",
    data: {
      streetAddress: "Zxc Garden",
      city: "Toronto",
      postCode: '56433',
      country: "Canada",
    }
  },
]


async function login() {
  await dsc.login({username: "userA", password: "password"})
}

function itemInList(dslist, item) {
  let result 
  if (dslist.getEntries().filter(entry=>entry===item).length===0) {
    result = false
  } else {
    result = true
  }
  return result
}

async function createRecord(recordName, data) {
    // 直接setData, 后续不需要subscribe等
    dsc.record.setData(recordName, data)
    // add into 'table'/list
    let tablePath = recordName.split('/')[0]
    let list = dsc.record.getList(tablePath)
    await list.whenReady()
    if (!itemInList(list, recordName)) list.addEntry(recordName)
}

async function getRecordPath(recordName,  path) {
  let record = dsc.record.getRecord(recordName)
  await record.whenReady()
  let result = record.get(path)
  return result
}

async function populateList(listName, arrayData) {
  let list = dsc.record.getList(listName)
  await list.whenReady()
  list.setEntries(arrayData)
}

async function addToLinkedList(recordName, path, entryOrList) {
  let listName = await getRecordPath(recordName, path)
  let linkedList = dsc.record.getList(listName)
  await linkedList.whenReady()
  if (!Array.isArray(entryOrList)) {
    if (!itemInList(linkedList, entryOrList)) 
      linkedList.addEntry(entryOrList)
  } else {
    if (linkedList.getEntries()!==entryOrList)
      linkedList.setEntries(entryOrList)
  }
}

async function printList(listName) {
  console.log("Print list name: ", listName)
  let list = dsc.record.getList(listName)
  await list.whenReady()
  let listEntries = list.getEntries()
  listEntries.forEach(async(recordName)=> {
    const record = dsc.record.getRecord(recordName)
    await record.whenReady()
    console.log("--record name: ", recordName)
    console.log("----data: ", record.get())
  })
}

async function populateData() {
  // create users
  users.forEach(async(record)=> {
    await createRecord(record.recName, record.data)
  })
  
  userDetails.forEach(async(record)=> {
    await createRecord(record.recName, record.data)
  })
  
  // create user billing address
  billingAddress.forEach(async(record)=> {
    await createRecord(record.recName, record.data)
  })

  // link billing addresses to user.addresses
  await addToLinkedList('users/abc-123', 'addresses', ['addresses/1', 'addresses/2'])
  await addToLinkedList('users/abc-456', 'addresses', ['addresses/3', 'addresses/4'])
}


async function main() {
  await dsc.login({username: "userA", password: "password"})
  
  /*
  dsc.record.setData('/users/new2', {id: "new2", firstname: "what?", lastname: "what?"})
   */
   
  let list = dsc.record.getList("/users")
  await list.whenReady()
  list.removeEntry('/users/new2')

  /*
  dsc.record.setData('/users/new555111', {id: "new5", firstname: "newBlabla", lastname: "nnnnnnnnnnnnnnnnnn5"})*/
  /*
  let list = dsc.record.getList('users')
  await list.whenReady()
  list.removeEntry('/users/abc-123')
  list.removeEntry('/users/abc-456')*/
  
  
  //await populateData()
  await printList('/users')
  /*
  await printList('users_detail')
  await printList('addresses')
  let addresses = await getRecordPath('users/abc-123', 'addresses')
  printList(addresses)
  addresses = await getRecordPath('users/abc-456', 'addresses')
  printList(addresses)*/
}

main()
