// Main entry point — registers components and starts the app
import '@tabler/core/dist/css/tabler.min.css'
import './styles/global-styles.css'
import { initializeTheme } from './styles/theme-manager.js'
import './components/app-shell.js'

initializeTheme()
