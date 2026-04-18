import './globals.css';

export const metadata = {
  title: 'Protractor',
  description: 'Brutalist angle precision game'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
