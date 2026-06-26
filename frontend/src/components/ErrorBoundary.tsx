import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

// Catches render-time errors so a thrown component shows a fallback
// instead of an unrecoverable white screen.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled UI error:', error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <div className="empty-state">
        <div className="empty-icon">⚠️</div>
        <div className="empty-title">Something went wrong</div>
        <div className="empty-sub">{this.state.error.message}</div>
        <button className="filter-toggle" onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    );
  }
}
