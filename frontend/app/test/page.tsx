export default function TestPage() {
  return (
    <div className="min-h-screen bg-black p-8">
      <h1 className="text-4xl font-bold text-white mb-4">Tailwind Test Page</h1>
      <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-8 rounded-lg">
        <p className="text-white">If you can see this gradient box, Tailwind is working!</p>
      </div>
      <div className="mt-4 bg-gray-800 p-4 rounded border border-gray-700">
        <p className="text-gray-300">Dark themed box</p>
      </div>
    </div>
  )
}