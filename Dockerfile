FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Download the latest stable standalone release of the Java Minecraft Client directly
ADD https://github.com bot.jar

# Build out the plain text configuration layout requirements directly
RUN echo 'server=cobbleguymon.aternos.me:26621' > config.properties && \
    echo 'username=brochacho' >> config.properties && \
    echo 'version=1.21.1' >> config.properties && \
    echo 'online-mode=false' >> config.properties && \
    echo 'join-commands=/register chalol78 chalol78,/login chalol78' >> config.properties

# Set up dummy keepalive environmental variables
ENV PORT=3000
EXPOSE 3000

CMD ["java", "-jar", "bot.jar"]
