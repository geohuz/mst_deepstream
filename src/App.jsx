/*
todo: create useDSRecord
useDSList
*/
import {useEffect, useState, useRef } from 'react'
import { useDsClient } from './contexts.jsx'
import Comp from "./comp.jsx"

function App() {
  const dsc = useDsClient()
  const [user, setUser] = useState({})
  const [detail, setDetail] = useState({})

  const inputFirstName = useRef(null)
  const inputLastName = useRef(null)


  useEffect(()=> {
    async function prep() {
      await dsc.login({username: "userA", password: "password"})
      let record = dsc.record.getRecord('users/abc-123')
      await record.whenReady()
      const user = record.get()
      setUser({
        firstname: user.firstname,
        lastname: user.lastname
      })
      record.subscribe(data=> {
        console.log('useEffect changed: ', data)
        setUser({
          firstname: data.firstname,
          lastname: data.lastname,
        })
      })

      record = dsc.record.getRecord('details/abc-123') 
      await record.whenReady()
      const detail = record.get()
      if (Object.keys(detail).length===0) {
        record.set({
          address: 'Berlin',
          cardNumber: 'xxx-xxx-xx',
          dob: 101
        })
      } else {
        setDetail({
          address: detail.address,
          cardNumber: detail.cardNumber,
          dob: detail.dob,
        })
        record.subscribe(data=> {
          setDetail({
            address: detail.address,
            cardNumber: detail.cardNumber,
            dob: detail.dob,
          })
        })
      }
    }
    prep().catch(console.error)
  }, [])

  function handleChange() {
    let record = dsc.record.getRecord('users/abc-123')
    record.whenReady(()=> {
      record.set({
        lastname: inputLastName.current.value,
        firstname: inputFirstName.current.value
      })
    })
  }

  return (
    <>
      {user && (
        <>
          <div>firstname: {user.firstname}</div> 
          <div>lastname: {user.lastname}</div>
          <div>address: {detail.address}</div>
          <div>cardNumber: {detail.address}</div>
          <div>cardNumber: {detail.cardNumber}</div>
          <div>dob: {detail.dob}</div>
          <span>fistname</span><input type="text" ref={inputFirstName}/>
          <span>lastname</span><input type="text" ref={inputLastName}/>
          <button onClick={()=>handleChange()}/>
        </>
      )
      }
    </>
  )
}

export default App
