import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export function AuthStatus() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-sm">Authentication Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-gray-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Checking authentication...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle className="text-sm">Authentication Status</CardTitle>
      </CardHeader>
      <CardContent>
        {user ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">Authenticated</span>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <div><strong>Email:</strong> {user.email}</div>
              {user.user_metadata?.name && (
                <div><strong>Name:</strong> {user.user_metadata.name}</div>
              )}
              <div><strong>User ID:</strong> {user.id.substring(0, 8)}...</div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-red-600">
            <XCircle className="w-5 h-5" />
            <span className="font-semibold">Not Authenticated</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
