package io.chauki.api.guess.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record GuessRequest(
        @NotBlank String puzzleId,
        @NotBlank String guess,
        @Min(0) @Max(5) int attemptIndex
) {}
