export const metadata = {
  title: "MK AutoEditor — image + video · voiceover sync",
  description: "Sync timestamp-named images and video clips to a voiceover and export an MP4, on your device.",
  icons: { icon: "/logo.svg" },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Anton&family=Bangers&family=Bebas+Neue&family=Cinzel:wght@700&family=Montserrat:wght@700;900&family=Outfit:wght@700;800&family=Poppins:wght@700;800&family=Russo+One&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('error', function(e) {
                var errObj = {
                  message: e.message || String(e),
                  filename: e.filename,
                  lineno: e.lineno,
                  colno: e.colno,
                  stack: (e.error && e.error.stack) || null
                };
                console.error("WINDOW_ERROR_INTERCEPTED:", errObj);
                try {
                  var xhr = new XMLHttpRequest();
                  xhr.open('POST', '/api/log-error', true);
                  xhr.setRequestHeader('Content-Type', 'application/json');
                  xhr.send(JSON.stringify(errObj));
                } catch(_) {}
              });
              window.addEventListener('unhandledrejection', function(e) {
                var errObj = {
                  type: 'unhandledrejection',
                  reason: String(e.reason),
                  stack: (e.reason && e.reason.stack) || null
                };
                console.error("UNHANDLED_REJECTION_INTERCEPTED:", errObj);
                try {
                  var xhr = new XMLHttpRequest();
                  xhr.open('POST', '/api/log-error', true);
                  xhr.setRequestHeader('Content-Type', 'application/json');
                  xhr.send(JSON.stringify(errObj));
                } catch(_) {}
              });
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
