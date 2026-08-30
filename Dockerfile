FROM ghcr.io/mcconsoleclient/minecraft-console-client:latest

WORKDIR /app

# Copy configuration details
COPY MinecraftClient.ini .
COPY sample-script.txt .

# Keep-alive environmental variable mapping
ENV PORT=3000
EXPOSE 3000

CMD ["MinecraftClient"]
