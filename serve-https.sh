#!/bin/bash
# HTTPS server for Inventory Helper
# Required for camera access on mobile devices

PORT=8000

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
echo "Local access:"
echo "  https://localhost:$PORT"
echo "  https://127.0.0.1:$PORT"
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
python3 - <<'EOF'
import http.server
import ssl
import sys

PORT = 8000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add headers to allow camera access
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
        super().end_headers()

    def log_message(self, format, *args):
        # Custom log format
        sys.stderr.write("%s - - [%s] %s\n" %
                         (self.address_string(),
                          self.log_date_time_string(),
                          format%args))

httpd = http.server.HTTPServer(('0.0.0.0', PORT), MyHTTPRequestHandler)

# Create SSL context
ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
ssl_context.load_cert_chain('server.pem')

# Wrap the socket with SSL
httpd.socket = ssl_context.wrap_socket(httpd.socket, server_side=True)

print(f"Server running on port {PORT}...")
httpd.serve_forever()
EOF
