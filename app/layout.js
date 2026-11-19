export const metadata = { title: 'Clinic', robots: { index: false, follow: false } };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#faf7fd', color: '#1f1530', fontSize: 18 }}>
        {children}
      </body>
    </html>
  );
}
