import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-6">
      <div className="card max-w-lg p-8 text-center">
        <p className="text-5xl font-extrabold text-primary-500">404</p>
        <h1 className="mt-3 text-2xl font-bold">Page Not Found</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          The page you are trying to access is not available.
        </p>
        <Link to="/" className="btn-primary mt-6">
          Go to Home
        </Link>
      </div>
    </div>
  )
}
