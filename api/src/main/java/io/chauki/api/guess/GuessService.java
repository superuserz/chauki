package io.chauki.api.guess;

import io.chauki.api.error.InvalidGuessFormatException;
import io.chauki.api.error.InvalidWordException;
import io.chauki.api.guess.dto.GuessRequest;
import io.chauki.api.guess.dto.GuessResponse;
import io.chauki.api.guess.dto.LetterStatus;
import io.chauki.api.puzzle.CachedPuzzle;
import io.chauki.api.puzzle.PuzzleService;
import io.chauki.api.puzzle.dto.Language;
import io.chauki.api.word.AksharaUtil;
import io.chauki.api.word.WordRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class GuessService {

    private static final int MAX_ATTEMPTS = 6;

    private final PuzzleService puzzleService;
    private final WordRepository wordRepo;
    private final GuessGrader grader;

    public GuessService(PuzzleService puzzleService, WordRepository wordRepo, GuessGrader grader) {
        this.puzzleService = puzzleService;
        this.wordRepo = wordRepo;
        this.grader = grader;
    }

    public GuessResponse submit(GuessRequest req) {
        CachedPuzzle puzzle = puzzleService.resolve(req.puzzleId());
        Language lang = puzzle.lang();

        String normalized = AksharaUtil.normalize(lang, req.guess());
        List<String> guessLetters = AksharaUtil.split(lang, normalized);

        if (guessLetters.size() != puzzle.letters().size()) {
            throw new InvalidGuessFormatException(
                    "Guess must be " + puzzle.letters().size() + " letters; got " + guessLetters.size());
        }

        if (!wordRepo.existsByLangAndText(lang, normalized)) {
            throw new InvalidWordException("Not in dictionary: " + req.guess());
        }

        List<LetterStatus> statuses = grader.grade(guessLetters, puzzle.letters());
        boolean solved = statuses.stream().allMatch(s -> s == LetterStatus.CORRECT);
        int attemptsUsed = req.attemptIndex() + 1;
        int attemptsRemaining = Math.max(0, MAX_ATTEMPTS - attemptsUsed);
        String revealedWord = (solved || attemptsUsed >= MAX_ATTEMPTS)
                ? String.join("", puzzle.letters())
                : null;

        return new GuessResponse(statuses, solved, attemptsUsed, attemptsRemaining, revealedWord);
    }
}
