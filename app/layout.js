export const metadata = {
  title: "MK AutoEditor — image + video · voiceover sync",
  description: "Sync timestamp-named images and video clips to a voiceover and export an MP4, on your device.",
  icons: { icon: "/logo.svg" },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
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
