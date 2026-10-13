# Runtime-only image: the boot jar is built on the host first (see dry-run.sh, which runs
# `./gradlew bootJar` before `docker compose build query-engine`). This container intentionally
# has no in-memory state of its own -- all lifecycle data (drafts, published queries) lives in
# Postgres, so stopping/starting this container is expected to lose nothing. That's exactly what
# the manual "did we leave anything in memory" test in dry-run.sh/README exercises.
FROM eclipse-temurin:25-jre

WORKDIR /app
COPY build/libs/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
