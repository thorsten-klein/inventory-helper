#!/bin/bash
# HTTPS server for Inventory Helper
# Required for camera access on mobile devices

PORT=8001

# Generate self-signed certificate if it doesn't exist
if [ ! -f server.pem ]; then
    echo "Generating self-signed certificate..."
    openssl req -new -x509 -keyout server.pem -out server.pem -days 365 -nodes \
        -subj "/C=DE/ST=State/L=City/O=Organization/CN=192.168.178.69"
    echo "Certificate generated: server.pem"
fi

# Get local IP
LOCAL_IP=$(hostname -I | awk '{print $1}')

echo "=========================================="
echo "Starting Inventory Helper HTTPS Server"
echo "=========================================="
echo ""
echo "Local access (use IPv4 to avoid delays):"
echo "  https://127.0.0.1:$PORT"
echo "  https://$LOCAL_IP:$PORT (from Windows/WSL)"
echo ""
echo "Network access (from phone):"
echo "  https://$LOCAL_IP:$PORT"
echo "  https://192.168.178.69:$PORT"
echo ""
echo "⚠️  IMPORTANT: You will see a security warning"
echo "    because this is a self-signed certificate."
echo "    Click 'Advanced' → 'Proceed anyway' to continue."
echo ""
echo "Press Ctrl+C to stop"
echo "=========================================="
echo ""

# Create a simple Python HTTPS server
python3 -u - <<'EOF'
import http.server
import ssl
import sys
import socketserver
import socket

PORT = 8001

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    protocol_version = 'HTTP/1.0'

    # Disable reverse DNS lookup completely
    def address_string(self):
        return str(self.client_address[0])

    def end_headers(self):
        # Add headers to allow camera access
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
        self.send_header('Connection', 'close')
        super().end_headers()

    def log_message(self, format, *args):
        # Use IP address directly to avoid slow reverse DNS lookup
        sys.stderr.write("%s - - [%s] %s\n" %
                         (self.client_address[0],
                          self.log_date_time_string(),
                          format%args))
        sys.stderr.flush()

class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def server_bind(self):
        self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        http.server.HTTPServer.server_bind(self)

# Create server with threading support
httpd = ThreadedHTTPServer(('0.0.0.0', PORT), MyHTTPRequestHandler)

# Create SSL context
ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
ssl_context.load_cert_chain('server.pem')

# Wrap the socket with SSL
httpd.socket = ssl_context.wrap_socket(httpd.socket, server_side=True)

print(f"Server running on port {PORT}...", flush=True)
httpd.serve_forever()
EOF
