package fr.urbanhair.product;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class ProductCatalogInitializer implements ApplicationRunner {
    private final ProductRepository repository;

    public ProductCatalogInitializer(ProductRepository repository) {
        this.repository = repository;
    }

    @Override
    public void run(ApplicationArguments arguments) {
        repository.seedLegacyCatalog();
    }
}
