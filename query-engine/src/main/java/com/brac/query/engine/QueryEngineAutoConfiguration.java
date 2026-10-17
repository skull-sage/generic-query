package com.brac.query.engine;

import io.r2dbc.spi.ConnectionFactory;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.core.io.ClassPathResource;
import org.springframework.r2dbc.connection.init.ConnectionFactoryInitializer;
import org.springframework.r2dbc.connection.init.ResourceDatabasePopulator;

/**
 * Plugs query-engine into any Spring Boot service that has it on the classpath: registers the
 * engine's controllers ({@code /engine/*}, {@code /data-query}, {@code /query-roles}), service,
 * stores and error handling, and creates the engine's own tables in the service's database.
 *
 * <p>The consuming service supplies only its domain specifics: its R2DBC connection
 * ({@code spring.r2dbc.*}) and its projection tables. Registered through
 * {@code META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports}, so
 * the service's own component scan doesn't need to know the engine's package.
 */
@AutoConfiguration
@ComponentScan(basePackageClasses = QueryEngineAutoConfiguration.class)
public class QueryEngineAutoConfiguration {

    /** Classpath location of the engine's DDL + identity catalog seed. */
    public static final String SCHEMA_LOCATION = "query-engine/schema.sql";

    /**
     * Runs {@link #SCHEMA_LOCATION} on startup. Every statement in it is idempotent. Set
     * {@code query-engine.schema.initialize=false} when the schema is managed elsewhere (e.g. by
     * a migration tool).
     */
    @Bean
    @ConditionalOnProperty(prefix = "query-engine.schema", name = "initialize", havingValue = "true", matchIfMissing = true)
    public ConnectionFactoryInitializer queryEngineSchemaInitializer(ConnectionFactory connectionFactory) {
        ConnectionFactoryInitializer initializer = new ConnectionFactoryInitializer();
        initializer.setConnectionFactory(connectionFactory);
        initializer.setDatabasePopulator(new ResourceDatabasePopulator(new ClassPathResource(SCHEMA_LOCATION)));
        return initializer;
    }
}
