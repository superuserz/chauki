package io.chauki.api.puzzle.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record PuzzleResponse(
        String puzzleId,
        PuzzleMode mode,
        Language lang,
        int length,
        Integer dailyNumber,
        Instant resetsAtUtc
) {
    public static PuzzleResponse daily(String puzzleId, Language lang, int length,
                                       int dailyNumber, Instant resetsAtUtc) {
        return new PuzzleResponse(puzzleId, PuzzleMode.DAILY, lang, length, dailyNumber, resetsAtUtc);
    }

    public static PuzzleResponse practice(String puzzleId, Language lang, int length) {
        return new PuzzleResponse(puzzleId, PuzzleMode.PRACTICE, lang, length, null, null);
    }
}
