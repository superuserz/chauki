package io.chauki.api.puzzle;

import io.chauki.api.common.ApiResponse;
import io.chauki.api.puzzle.dto.Language;
import io.chauki.api.puzzle.dto.PracticePuzzleRequest;
import io.chauki.api.puzzle.dto.PuzzleResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/puzzles")
public class PuzzleController {

    private final PuzzleService puzzleService;

    public PuzzleController(PuzzleService puzzleService) {
        this.puzzleService = puzzleService;
    }

    @GetMapping("/today")
    public ApiResponse<PuzzleResponse> today(@RequestParam("lang") Language lang) {
        return ApiResponse.ok(puzzleService.today(lang));
    }

    @PostMapping("/practice")
    public ResponseEntity<ApiResponse<PuzzleResponse>> practice(
            @Valid @RequestBody PracticePuzzleRequest req
    ) {
        PuzzleResponse resp = puzzleService.practice(req.lang(), req.excludeRecent());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(resp));
    }
}
