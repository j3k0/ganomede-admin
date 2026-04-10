import { useRouteError, isRouteErrorResponse } from "react-router";

export function RouteErrorPage() {
  const error = useRouteError();

  const message = isRouteErrorResponse(error)
    ? `${error.status}: ${error.statusText}`
    : error instanceof Error
      ? error.message
      : "An unexpected error occurred";

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold text-red-600">Something went wrong</h1>
        <p className="mt-2 text-gray-600">{message}</p>
        <button
          className="mt-4 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          onClick={() => window.location.reload()}
        >
          Reload Page
        </button>
      </div>
    </div>
  );
}
