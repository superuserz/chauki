package io.chauki.api.puzzle;

import io.chauki.api.puzzle.dto.Language;
import io.chauki.api.puzzle.dto.PuzzleMode;

import java.util.List;

public record CachedPuzzle(
        String puzzleId,
        String wordId,
        List<String> letters,
        Language lang,
        PuzzleMode mode,
        Integer dailyNumber
) {}
