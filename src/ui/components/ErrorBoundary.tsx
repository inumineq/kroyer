import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('SMK Open UI error:', error, info)
  }

  reset = () => this.setState({ hasError: false, error: null })

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary" role="alert">
          <div className="error-boundary__icon" aria-hidden="true">
            ⚠
          </div>
          <p className="error-boundary__title">Something went wrong</p>
          {this.state.error && (
            <p className="error-boundary__detail">{this.state.error.message}</p>
          )}
          <button type="button" className="error-boundary__reset" onClick={this.reset}>
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
