import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('App error boundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100vh', gap: '16px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          color: '#374151', padding: '24px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '48px' }}>⚠️</div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Something went wrong</h2>
          <p style={{ margin: 0, color: '#6b7280', maxWidth: '400px' }}>
            The app encountered an unexpected error. Please refresh the page to try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#1a472a', color: 'white', border: 'none',
              borderRadius: '8px', padding: '10px 20px', cursor: 'pointer',
              fontSize: '14px', fontWeight: 500,
            }}
          >
            Refresh page
          </button>
          {this.state.error && (
            <pre style={{
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: '8px', padding: '16px', fontSize: '12px',
              textAlign: 'left', maxWidth: '600px', overflow: 'auto',
              color: '#991b1b',
            }}>
              {this.state.error.toString()}
            </pre>
          )}
        </div>
      )
    }
    return this.props.children
  }
}
