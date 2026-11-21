export const metadata = {
  title: 'Heeshas Healing Hands Spa',
  icons: { icon: '/logo.png', apple: '/logo.png' },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#faf7fd', color: '#1f1530', fontSize: 18 }}>
        {children}
      </body>
    </html>
  );
}
