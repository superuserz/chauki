package io.chauki.api.guess.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record GuessResponse(
        List<LetterStatus> statuses,
        boolean isSolved,
        int attemptsUsed,
        int attemptsRemaining,
        String revealedWord
) {}
