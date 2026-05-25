export const metadata = {
  title: "Survey Dashboard",
  description: "Survey Dashboard",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
