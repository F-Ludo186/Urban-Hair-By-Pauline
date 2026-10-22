package fr.urbanhair.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ImageStorageConfig {
    @Bean
    @ConditionalOnProperty(name = "urbanhair.storage.provider", havingValue = "local", matchIfMissing = true)
    ImageStorage localImageStorage(@Value("${urbanhair.storage.local-directory:./data/images}") String directory) {
        return new LocalImageStorage(directory);
    }
}
