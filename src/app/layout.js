import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

export const metadata = {
  title: 'LoadShed Monitor',
  description: 'Electrical Distribution Loadshed Monitoring System',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}