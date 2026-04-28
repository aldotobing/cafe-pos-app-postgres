'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SWRErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface SWRErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; reset: () => void }>;
}

export class SWRErrorBoundary extends React.Component<SWRErrorBoundaryProps, SWRErrorBoundaryState> {
  constructor(props: SWRErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): SWRErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('SWR Error Boundary caught an error:', error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} reset={this.reset} />;
      }

      return (
        <Card className="m-4 max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <CardTitle className="text-red-800">Terjadi Kesalahan</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              {this.state.error?.message || 'Terjadi kesalahan saat memuat data. Silakan coba lagi.'}
            </p>
            <Button onClick={this.reset} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Default fallback component for specific use cases
export function SWRErrorFallback({ error, reset }: { error?: Error; reset: () => void }) {
  return (
    <div className="p-4 text-center">
      <div className="inline-flex items-center justify-center w-10 h-10 bg-amber-100 rounded-full mb-3">
        <AlertTriangle className="w-5 h-5 text-amber-600" />
      </div>
      <h3 className="text-sm font-medium text-amber-800 mb-2">Gagal Memuat Data</h3>
      <p className="text-xs text-muted-foreground mb-3">
        {error?.message || 'Tidak dapat memuat data dari server.'}
      </p>
      <Button onClick={reset} variant="outline" size="sm">
        <RefreshCw className="w-3 h-3 mr-1" />
        Refresh
      </Button>
    </div>
  );
}
