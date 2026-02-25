import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'

// 글로벌 에러 핸들러 — 잡히지 않는 에러도 화면에 표시
window.onerror = (msg, source, line, col, error) => {
    const root = document.getElementById('root');
    if (root) {
        root.innerHTML = `
            <div style="padding:40px;font-family:monospace;color:#ff5252;background:#0d0d1a;min-height:100vh">
                <h1 style="color:#ff4081">⚠️ JavaScript 오류</h1>
                <pre style="background:#1a1a2e;padding:20px;border-radius:8px;overflow:auto;margin-top:16px;white-space:pre-wrap">${msg}\n\n소스: ${source}\n라인: ${line}:${col}\n\n${error?.stack ?? ''}</pre>
            </div>
        `;
    }
};

window.addEventListener('unhandledrejection', (event) => {
    const root = document.getElementById('root');
    if (root) {
        root.innerHTML = `
            <div style="padding:40px;font-family:monospace;color:#ff5252;background:#0d0d1a;min-height:100vh">
                <h1 style="color:#ff4081">⚠️ Promise 오류</h1>
                <pre style="background:#1a1a2e;padding:20px;border-radius:8px;overflow:auto;margin-top:16px;white-space:pre-wrap">${event.reason}</pre>
            </div>
        `;
    }
});

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    </StrictMode>,
)
