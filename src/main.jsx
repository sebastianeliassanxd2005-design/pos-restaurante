import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RestaurantProvider } from './context/RestaurantContext.jsx'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RestaurantProvider>
      <App />
    </RestaurantProvider>
  </StrictMode>,
)
