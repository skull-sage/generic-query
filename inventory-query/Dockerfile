# Runtime-only image: the boot jar is built on the host first (dry-run.sh runs
# `./gradlew :inventory-query:bootJar`). The service keeps no in-memory lifecycle state, so
# stopping and starting this container loses nothing -- everything lives in its Postgres.
FROM eclipse-temurin:25-jre

WORKDIR /app
COPY build/libs/inventory-query-*.jar app.jar

EXPOSE 8082
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
