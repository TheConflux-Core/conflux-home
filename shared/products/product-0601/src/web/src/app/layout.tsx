import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CMMC Shield — AI Compliance Copilot',
  description: 'Navigate CMMC 2.0 Level 2 compliance with automated gap assessment, SSP generation, and POA&M creation.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <nav className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <a href="/" className="text-xl font-bold text-blue-700">🛡️ CMMC Shield</a>
            <div className="flex gap-4">
              <a href="/dashboard" className="text-gray-600 hover:text-blue-600">Dashboard</a>
              <a href="/assessment" className="text-gray-600 hover:text-blue-600">Assessment</a>
              <a href="/login" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Sign In</a>
            </div>
          </div>
        </nav>
        <main>{children}</main>
        <footer className="border-t py-6 mt-12">
          <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
            CMMC Shield — Built for small defense contractors. Not a substitute for legal advice.
          </div>
        </footer>
      </body>
    </html>
  );
}
