package io.chauki.api.config;

import java.time.LocalDate;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "chauki")
public record AppProperties(
        String seed,
        String dailySalt,
        LocalDate launchDate,
        String wordListVersion,
        String wordDataDir,
        Cors cors,
        RateLimit rateLimit,
        List<String> blocklist
) {
    public AppProperties {
        if (blocklist == null) blocklist = List.of();
    }

    public record Cors(List<String> allowedOrigins) {}

    public record RateLimit(
            int shortWindowSeconds,
            int shortLimit,
            int longWindowSeconds,
            int longLimit
    ) {}
}
