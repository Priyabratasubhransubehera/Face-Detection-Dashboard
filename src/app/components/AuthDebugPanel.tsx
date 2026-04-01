import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export function AuthDebugPanel() {
  const { user, loading, error } = useAuth();

  return (
    <Card className="mt-6 border-2 border-dashed border-yellow-300 bg-yellow-50">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Debug: Authentication Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="font-semibold">Loading:</span>
          <span className={loading ? "text-blue-600" : "text-gray-600"}>
            {loading ? "Yes" : "No"}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="font-semibold">User State:</span>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-green-600">Authenticated</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-red-600" />
                <span className="text-red-600">Not Authenticated</span>
              </>
            )}
          </div>
        </div>

        {user && (
          <>
            <div className="flex items-center justify-between">
              <span className="font-semibold">Email:</span>
              <span className="text-xs text-gray-700">{user.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold">User ID:</span>
              <span className="text-xs text-gray-700">{user.id.substring(0, 12)}...</span>
            </div>
          </>
        )}

        {error && (
          <div className="pt-2 border-t border-yellow-300">
            <span className="font-semibold text-red-600">Error:</span>
            <p className="text-xs text-red-600 mt-1">{error}</p>
          </div>
        )}

        <div className="pt-2 border-t border-yellow-300 text-xs text-gray-600">
          <strong>Access Control:</strong> Dashboard is {user ? "ACCESSIBLE" : "BLOCKED"}
        </div>
      </CardContent>
    </Card>
  );
}
