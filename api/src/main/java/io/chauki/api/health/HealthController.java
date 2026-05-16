package io.chauki.api.health;

import io.chauki.api.common.ApiResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.info.BuildProperties;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.lang.management.ManagementFactory;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api")
public class HealthController {

    private final Optional<BuildProperties> buildProperties;

    @Value("${spring.application.name:chauki-api}")
    private String appName;

    public HealthController(Optional<BuildProperties> buildProperties) {
        this.buildProperties = buildProperties;
    }

    @GetMapping("/health")
    public ApiResponse<Map<String, Object>> health() {
        long uptimeSeconds = ManagementFactory.getRuntimeMXBean().getUptime() / 1000;
        String version = buildProperties.map(BuildProperties::getVersion).orElse("dev");
        return ApiResponse.ok(Map.of(
                "status", "ok",
                "service", appName,
                "version", version,
                "uptimeSeconds", uptimeSeconds
        ));
    }
}
