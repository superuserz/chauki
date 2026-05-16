package io.chauki.api.guess;

import io.chauki.api.common.ApiResponse;
import io.chauki.api.guess.dto.GuessRequest;
import io.chauki.api.guess.dto.GuessResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class GuessController {

    private final GuessService guessService;

    public GuessController(GuessService guessService) {
        this.guessService = guessService;
    }

    @PostMapping("/guess")
    public ApiResponse<GuessResponse> guess(@Valid @RequestBody GuessRequest req) {
        return ApiResponse.ok(guessService.submit(req));
    }
}
