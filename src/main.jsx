import { DeepstreamClientProvider} from './contexts.jsx'
import React from 'react'
import ReactDOM from 'react-dom/client'
import Root from './Root'
import './index.css'

import Reactotron from 'reactotron-react-js'
Reactotron.configure().connect()



ReactDOM.createRoot(document.getElementById('root')).render(
    <DeepstreamClientProvider>
      <Root />
    </DeepstreamClientProvider>
)
