// ============================
// 에러 바운더리 — React 런타임 에러를 화면에 표시
// 왜? 화면이 빈 채로 먹통이 되면 원인을 알 수 없으므로
// ============================

import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        this.setState({ errorInfo });
        console.error('[ErrorBoundary]', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: '40px',
                    fontFamily: 'monospace',
                    color: '#ff5252',
                    background: '#0d0d1a',
                    minHeight: '100vh',
                }}>
                    <h1 style={{ color: '#ff4081' }}>⚠️ 앱 렌더링 에러 발생</h1>
                    <pre style={{
                        background: '#1a1a2e',
                        padding: '20px',
                        borderRadius: '8px',
                        overflow: 'auto',
                        marginTop: '16px',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                    }}>
                        {this.state.error?.toString()}
                        {'\n\n'}
                        {this.state.errorInfo?.componentStack}
                    </pre>
                </div>
            );
        }
        return this.props.children;
    }
}
