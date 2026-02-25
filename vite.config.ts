import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// React JSX 변환을 위한 Vite 설정
export default defineConfig({
    plugins: [react()],
    server: {
        host: true
    }
})
