package io.chauki.api.error;

import org.springframework.http.HttpStatus;

public class PuzzleNotFoundException extends ApiException {
    public PuzzleNotFoundException(String puzzleId) {
        super(ErrorCode.PUZZLE_NOT_FOUND, HttpStatus.NOT_FOUND,
              "Puzzle not found or expired: " + puzzleId);
    }
}
