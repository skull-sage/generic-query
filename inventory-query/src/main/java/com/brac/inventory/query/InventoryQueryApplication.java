package com.brac.inventory.query;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * InventoryQuery service. All query endpoints come from query-engine through auto-configuration;
 * this service only points the engine at the Inventory domain's projection store.
 */
@SpringBootApplication
public class InventoryQueryApplication {

    public static void main(String[] args) {
        SpringApplication.run(InventoryQueryApplication.class, args);
    }
}
