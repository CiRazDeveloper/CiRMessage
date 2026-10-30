import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

import "./styles/general.css";

import Scrollbar from './components/view/ScrollBar.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
      <Scrollbar style={{ height: '100vh' }}>
          <App />
      </Scrollbar>
  </StrictMode>,
)
