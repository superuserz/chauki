package io.chauki.api.error;

import java.util.Map;
import org.springframework.http.HttpStatus;

public class RateLimitException extends ApiException {
    private final long retryAfterSeconds;

    public RateLimitException(long retryAfterSeconds) {
        super(ErrorCode.RATE_LIMITED, HttpStatus.TOO_MANY_REQUESTS,
              "Too many requests; retry after " + retryAfterSeconds + "s",
              Map.of("retryAfterSeconds", retryAfterSeconds));
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public long retryAfterSeconds() { return retryAfterSeconds; }
}
