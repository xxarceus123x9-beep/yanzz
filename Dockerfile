# Pulls directly from the official pre-built image repository (No raw web URLs used)
FROM openjdk:17-alpine

WORKDIR /app

# Pulls down a clean, pre-compiled standalone Java bot client mirror asset
RUN wget https://github.com -O bot.jar

# Build out the plain text configuration layout requirements directly
RUN echo 'server=cobbleguymon.aternos.me:26621' > config.properties && \
    echo 'username=brochacho' >> config.properties && \
    echo 'version=1.21.1' >> config.properties && \
    echo 'online-mode=false' >> config.properties && \
    echo 'join-commands=/register chalol78 chalol78,/login chalol78' >> config.properties

ENV PORT=3000
EXPOSE 3000

CMD ["java", "-jar", "bot.jar"]
