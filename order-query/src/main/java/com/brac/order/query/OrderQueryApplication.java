package com.brac.order.query;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * OrderQuery service. All query endpoints come from query-engine through auto-configuration;
 * this service only points the engine at the Order domain's projection store.
 */
@SpringBootApplication
public class OrderQueryApplication {

    public static void main(String[] args) {
        SpringApplication.run(OrderQueryApplication.class, args);
    }
}
