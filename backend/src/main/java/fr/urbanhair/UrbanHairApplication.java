package fr.urbanhair;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class UrbanHairApplication {
    public static void main(String[] args) {
        SpringApplication.run(UrbanHairApplication.class, args);
    }
}
