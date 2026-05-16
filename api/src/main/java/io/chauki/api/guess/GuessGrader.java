package io.chauki.api.guess;

import io.chauki.api.guess.dto.LetterStatus;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class GuessGrader {

    public List<LetterStatus> grade(List<String> guess, List<String> answer) {
        if (guess.size() != answer.size()) {
            throw new IllegalArgumentException(
                    "size mismatch: guess=" + guess.size() + " answer=" + answer.size());
        }
        int n = guess.size();
        LetterStatus[] out = new LetterStatus[n];

        Map<String, Integer> remaining = new HashMap<>(n * 2);
        for (String s : answer) remaining.merge(s, 1, Integer::sum);

        for (int i = 0; i < n; i++) {
            if (guess.get(i).equals(answer.get(i))) {
                out[i] = LetterStatus.CORRECT;
                remaining.merge(guess.get(i), -1, Integer::sum);
            } else {
                out[i] = LetterStatus.ABSENT;
            }
        }
        for (int i = 0; i < n; i++) {
            if (out[i] == LetterStatus.ABSENT && remaining.getOrDefault(guess.get(i), 0) > 0) {
                out[i] = LetterStatus.PRESENT;
                remaining.merge(guess.get(i), -1, Integer::sum);
            }
        }
        return Arrays.asList(out);
    }
}
