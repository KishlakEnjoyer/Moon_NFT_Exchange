openssl rand -hex 32 # Generate private keys
serve File/Path --cors -p 5001 # Local server
docker compose -f docker-compose.prod.yaml up -d --build
npm start # from frontend/, or npm run build; npx serve -s build -l 3000
C:\Cloudflared\bin\cloudflared.exe tunnel run moon-local
docker compose up --build
host.docker.internal
