/*
todo: create useDSRecord
useDSList
*/
import { user_model, user_detail_model } from './models'
import { useRef } from 'react'
import { useDSRecord} from './dsHooks.jsx'

export default function App() {
  const id = "abc-123"
  const [userData, updateRecord] = useDSRecord({model: user_model, id: id})
  const [userDetailData, updateRecord1] = useDSRecord({model: user_detail_model, id: id})

  const inputFirstName = useRef(null)
  const inputLastName = useRef(null)
  const inputAddress = useRef(null)
  const inputCardNumber = useRef(null)

  function handleChange1() {
    updateRecord(
      {
        firstname: inputFirstName.current.value, 
        lastname: inputLastName.current.value
      }
    )
  }
  function handleChange2() {
    updateRecord1(
      {
        address: inputAddress.current.value, 
        cardNumber: inputCardNumber.current.value
      }
    )
  }

  return (
    <>
      {userData && (
        <>
          <div>firstname: {userData.firstname}</div> 
          <div>lastname: {userData.lastname}</div>
          <span>firstname</span><input type="text" ref={inputFirstName}/>
          <span>lastname</span><input type="text" ref={inputLastName}/>
          <button onClick={()=>handleChange1()}/>
        </>
      )}
      {userDetailData && (
        <>
          <div>address: {userDetailData.address}</div> 
          <div>cardNumber: {userDetailData.cardNumber}</div>
          <span>address</span><input type="text" ref={inputAddress} />
          <span>cardNumber</span><input type="text" ref={inputCardNumber} />
          <button onClick={()=>handleChange2()}/>
        </>
      )}
    </>
  )
}
    