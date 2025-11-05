/**
 * Environment Variable Debug Page
 *
 * This page helps diagnose environment variable issues on deployed sites.
 * Navigate to /env-debug to see this page.
 */

export function EnvDebug() {
  const envVars = import.meta.env;
  const apiKey = import.meta.env.VITE_IMGBB_API_KEY;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">
          Environment Variables Debug
        </h1>

        {/* API Key Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            ImgBB API Key Status
          </h2>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700 dark:text-gray-300">Configured:</span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  apiKey
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}
              >
                {apiKey ? '✓ Yes' : '✗ No'}
              </span>
            </div>
            {apiKey && (
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-700 dark:text-gray-300">Key Length:</span>
                <span className="text-gray-900 dark:text-gray-100">{apiKey.length} characters</span>
              </div>
            )}
            {apiKey && (
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-700 dark:text-gray-300">First 8 chars:</span>
                <span className="font-mono text-sm text-gray-900 dark:text-gray-100">
                  {apiKey.substring(0, 8)}...
                </span>
              </div>
            )}
          </div>
        </div>

        {/* All Environment Variables */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            All Environment Variables
          </h2>
          <div className="space-y-2">
            {Object.entries(envVars).map(([key, value]) => (
              <div
                key={key}
                className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded"
              >
                <span className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100 min-w-[200px]">
                  {key}
                </span>
                <span className="font-mono text-sm text-gray-700 dark:text-gray-300 break-all">
                  {typeof value === 'string'
                    ? key.includes('KEY') || key.includes('SECRET')
                      ? `${String(value).substring(0, 8)}... (${String(value).length} chars)`
                      : String(value)
                    : JSON.stringify(value)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-blue-900 dark:text-blue-100">
            Troubleshooting Steps
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>
              Verify <code className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm">VITE_IMGBB_API_KEY</code> appears in the list above
            </li>
            <li>
              If missing: Go to Vercel dashboard → Project Settings → Environment Variables
            </li>
            <li>
              Add variable with name <code className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm">VITE_IMGBB_API_KEY</code> (exact spelling)
            </li>
            <li>Check all three environment boxes (Production, Preview, Development)</li>
            <li>Click Save</li>
            <li>Go to Deployments tab → Click (...) on latest → Redeploy WITHOUT using cache</li>
            <li>Wait for deployment to complete, then refresh this page</li>
          </ol>
        </div>

        {/* Build Info */}
        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Build Time: {new Date().toISOString()}</p>
          <p className="mt-1">
            Mode: {import.meta.env.MODE} | DEV: {import.meta.env.DEV ? 'true' : 'false'} | PROD: {import.meta.env.PROD ? 'true' : 'false'}
          </p>
        </div>
      </div>
    </div>
  );
}
