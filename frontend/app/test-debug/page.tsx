export default function TestDebugPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-light-50 to-accent-50 p-8">
      <div className="container mx-auto">
        <h1 className="text-4xl font-bold text-secondary-800 mb-8">Test Debug Page</h1>
        
        {/* Debug Info */}
        <div className="mb-4 p-4 bg-blue-100 border border-blue-400 rounded">
          <p className="text-sm text-blue-800 font-bold">DEBUG PAGE INFO</p>
          <p className="text-sm text-blue-800">This is a test debug page</p>
          <p className="text-sm text-blue-800">Time: {new Date().toISOString()}</p>
        </div>

        {/* Force Render CategoryProducts */}
        <div className="mb-4 p-4 bg-green-100 border border-green-400 rounded">
          <p className="text-sm text-green-800 font-bold">FORCE RENDER CATEGORY PRODUCTS</p>
          <p className="text-sm text-green-800">Category Slug: test-category</p>
          <p className="text-sm text-green-800">Component should render below:</p>
        </div>

        {/* Products Grid */}
        <div className="mb-4 p-4 bg-orange-100 border border-orange-400 rounded">
          <p className="text-sm text-orange-800 font-bold">CATEGORY PRODUCTS COMPONENT RENDERED</p>
          <p className="text-sm text-orange-800">Category Slug: test-category</p>
          <p className="text-sm text-orange-800">Loading: false</p>
          <p className="text-sm text-orange-800">Error: нет</p>
          <p className="text-sm text-orange-800">Products Count: 0</p>
        </div>

        {/* Force Render Debug */}
        <div className="mt-8 p-4 bg-purple-100 border border-purple-400 rounded">
          <p className="text-sm text-purple-800 font-bold">AFTER CATEGORY PRODUCTS RENDER</p>
          <p className="text-sm text-purple-800">If you see this, CategoryProducts rendered</p>
        </div>
      </div>
    </div>
  );
} 