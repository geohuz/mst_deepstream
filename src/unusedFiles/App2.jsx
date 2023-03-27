import { user_model, user_detail_model } from './models'
import { useRef } from 'react'
import { useDSRecord, useDSList} from './dsHooks.jsx'

export default function App() {
  const listData = useDSList("users")
  const listData1 = useDSList("users_detail")
  const listData2 = useDSList("addresses")

  return (
    <>
      <h1>users</h1>
      {
        listData.map(item=> 
          <div>
            <span>{item.firstname} </span>
            <span>{item.lastname}  </span>
          </div>
        )
      }
      <h2>users detail</h2>
      {
        listData1.map(item=>
          <div>
            <span>{item.address} </span>
            <span>{item.cardNumber}  </span>
          </div>   
        )
      }
      <h1>addresses</h1>
      {
        listData2.map(item=>
          <div>
            <span>{item.streetAddress} </span>
            <span>{item.city}  </span>
          </div>   
        )
      }
    </>
  )
}