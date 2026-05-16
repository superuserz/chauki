package io.chauki.api;

import io.chauki.api.config.AppProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(AppProperties.class)
public class ChaukiApplication {

    public static void main(String[] args) {
        SpringApplication.run(ChaukiApplication.class, args);
    }
}
