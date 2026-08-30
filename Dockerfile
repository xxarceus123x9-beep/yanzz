FROM ://microsoft.com AS base
WORKDIR /app

# Download the latest stable Linux build of Minecraft-Console-Client
RUN apt-get update && apt-get install -y wget unzip && \
    wget https://github.com -O mcc.zip && \
    unzip mcc.zip && \
    rm mcc.zip && \
    chmod +x MinecraftClient

# Copy your configuration scripts into the container app directory
COPY MinecraftClient.ini .
COPY sample-script.txt .

# Keep-alive web check port variable binding for cloud hosting platforms
ENV PORT=3000
EXPOSE 3000

# Execute the console client
CMD ["./MinecraftClient"]
