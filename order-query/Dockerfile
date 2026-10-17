# Runtime-only image: the boot jar is built on the host first (dry-run.sh runs
# `./gradlew :order-query:bootJar`). The service keeps no in-memory lifecycle state, so stopping
# and starting this container loses nothing -- everything lives in its Postgres.
FROM eclipse-temurin:25-jre

WORKDIR /app
COPY build/libs/order-query-*.jar app.jar

EXPOSE 8081
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
