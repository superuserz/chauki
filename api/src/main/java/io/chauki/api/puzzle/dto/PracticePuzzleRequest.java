package io.chauki.api.puzzle.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record PracticePuzzleRequest(
        @NotNull Language lang,
        @Size(max = 50, message = "excludeRecent may have at most 50 entries") List<String> excludeRecent
) {
    public PracticePuzzleRequest {
        if (excludeRecent == null) excludeRecent = List.of();
    }
}
