package io.chauki.api.puzzle;

import io.chauki.api.config.AppProperties;
import io.chauki.api.puzzle.dto.Language;
import io.chauki.api.word.WordDocument;
import io.chauki.api.word.WordRepository;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Set;

@Component
public class DailyWordSelector {

    private final WordRepository repo;
    private final AppProperties props;

    public DailyWordSelector(WordRepository repo, AppProperties props) {
        this.repo = repo;
        this.props = props;
    }

    public WordDocument selectFor(LocalDate dateUtc, Language lang) {
        List<WordDocument> all = repo.findAllByLangAndDailyPoolTrue(lang);
        if (all.isEmpty()) {
            throw new IllegalStateException("Daily pool is empty for lang=" + lang);
        }
        Set<String> blocked = Set.copyOf(props.blocklist());
        List<WordDocument> pool = all.stream()
                .filter(w -> !blocked.contains(w.id()))
                .sorted(Comparator.comparing(WordDocument::id))
                .toList();
        if (pool.isEmpty()) {
            throw new IllegalStateException("Daily pool fully blocked for lang=" + lang);
        }
        long n = hashIndex(dateUtc, lang);
        int idx = (int) Math.floorMod(n, pool.size());
        return pool.get(idx);
    }

    private long hashIndex(LocalDate dateUtc, Language lang) {
        String msg = dateUtc.toString() + ":" + lang.name();
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(props.seed().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] sig = mac.doFinal(msg.getBytes(StandardCharsets.UTF_8));
            return ByteBuffer.wrap(sig, 0, 8).getLong() & Long.MAX_VALUE;
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException("HMAC-SHA256 failed", ex);
        }
    }
}
