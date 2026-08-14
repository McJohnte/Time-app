import { createRoot } from 'react-dom/client'
import '@fontsource/space-grotesk/400.css'
import '@fontsource/space-grotesk/500.css'
import '@fontsource/space-grotesk/600.css'
import '@fontsource/space-grotesk/700.css'
import '@fontsource/roboto/300.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import './styles.css'
import Widget from './components/Widget'
import ReviewWindow from './components/ReviewWindow'

const isReview = new URLSearchParams(location.search).get('window') === 'review'

createRoot(document.getElementById('root')).render(isReview ? <ReviewWindow /> : <Widget />)
