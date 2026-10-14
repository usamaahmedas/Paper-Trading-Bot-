import React from 'react';

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Dashboard render error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: 'monospace' }}>
          <h1 style={{ fontSize: 18, fontWeight: 700 }}>Something went wrong rendering the dashboard.</h1>
          <pre style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>{this.state.error.message}</pre>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 12, padding: '6px 12px', border: '1px solid #1A1A1A', cursor: 'pointer' }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
