package io.chauki.api.puzzle;

import io.chauki.api.puzzle.dto.Language;
import io.chauki.api.word.WordDocument;
import io.chauki.api.word.WordRepository;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.util.Collection;
import java.util.List;
import java.util.Set;

@Component
public class PracticeWordSelector {

    private final WordRepository repo;
    private final SecureRandom rng = new SecureRandom();

    public PracticeWordSelector(WordRepository repo) {
        this.repo = repo;
    }

    public WordDocument pick(Language lang, Collection<String> excludeRecent) {
        List<WordDocument> pool = filteredPool(lang, excludeRecent);
        if (pool.isEmpty()) {
            // fall back to ignoring excludeRecent rather than 500ing
            pool = repo.findAllByLang(lang);
            if (pool.isEmpty()) {
                throw new IllegalStateException("Practice pool empty for lang=" + lang);
            }
        }
        return pool.get(rng.nextInt(pool.size()));
    }

    private List<WordDocument> filteredPool(Language lang, Collection<String> excludeRecent) {
        Set<String> exclude = excludeRecent == null ? Set.of() : Set.copyOf(excludeRecent);
        return repo.findAllByLang(lang).stream()
                .filter(w -> !exclude.contains(w.id()))
                .toList();
    }
}
