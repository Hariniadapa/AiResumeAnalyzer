import React from "react";

/**
 * ErrorBoundary — wraps a subtree and catches runtime render errors.
 * Shows a styled fallback UI so the rest of the app keeps working.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary] Caught render error:", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center px-6">
          <div className="max-w-md w-full p-8 rounded-2xl border border-red-500/20 bg-slate-900/60 backdrop-blur-md shadow-[0_0_40px_rgba(239,68,68,0.08)] text-center">
            {/* Icon */}
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-8 h-8 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>

            <h2 className="text-xl font-extrabold text-slate-100 mb-2">
              Rendering Error
            </h2>
            <p className="text-sm text-slate-400 mb-2 leading-relaxed">
              A runtime error occurred in this module. The rest of the
              application is unaffected.
            </p>
            {this.state.error?.message && (
              <pre className="text-xs bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-red-300 text-left overflow-x-auto mb-5 whitespace-pre-wrap">
                {this.state.error.message}
              </pre>
            )}

            <button
              onClick={this.handleReset}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-bold transition-all shadow-lg"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
