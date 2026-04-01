import React from 'react';

export function AuthFlowDiagram() {
  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h3 className="text-xl font-bold mb-4">Authentication Flow</h3>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">1</div>
          <div className="flex-1 p-3 bg-blue-50 rounded">
            <strong>Email Validation:</strong> Check format using regex /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">2</div>
          <div className="flex-1 p-3 bg-blue-50 rounded">
            <strong>Supabase Request:</strong> Send credentials to Supabase Auth API
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold">✓</div>
          <div className="flex-1 p-3 bg-green-50 rounded">
            <strong>Success:</strong> Valid session → Redirect to Dashboard
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center font-bold">✗</div>
          <div className="flex-1 p-3 bg-red-50 rounded">
            <strong>Failure:</strong> Show error → Block access → Stay on login
          </div>
        </div>
      </div>
    </div>
  );
}
