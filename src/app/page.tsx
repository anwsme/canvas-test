import Canvas from '@/components/Canvas';

export default function Home() {
  return (
    <div className="h-screen w-full">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-semibold text-gray-900">Workflow Builder</h1>
        <p className="text-sm text-gray-600 mt-1">Drag and drop to create your workflow</p>
      </div>
      <Canvas />
    </div>
  );
}
