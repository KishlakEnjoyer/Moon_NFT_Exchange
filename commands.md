openssl rand -hex 32 # Generate private keys
serve File/Path --cors -p 5001 # Local server
ngrok http 3000
docker compose up --build
host.docker.internal