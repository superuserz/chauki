package io.chauki.api.word;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.chauki.api.config.AppProperties;
import io.chauki.api.puzzle.dto.Language;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Set;

@Component
public class WordLoader implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(WordLoader.class);
    private static final String BOOTSTRAP_KEY = "chauki:bootstrap:done";

    private final WordRepository repo;
    private final ObjectMapper mapper;
    private final AppProperties props;
    private final StringRedisTemplate redis;

    public WordLoader(WordRepository repo, ObjectMapper mapper,
                      AppProperties props, StringRedisTemplate redis) {
        this.repo = repo;
        this.mapper = mapper;
        this.props = props;
        this.redis = redis;
    }

    @Override
    public void run(String... args) {
        Path dataDir = Path.of(props.wordDataDir()).toAbsolutePath().normalize();
        log.info("Loading word lists from {}", dataDir);
        try {
            int hi = loadFile(dataDir.resolve("words-hi.json"), Language.HI, false);
            int hiDaily = loadFile(dataDir.resolve("words-hi-daily.json"), Language.HI, true);
            int en = loadFile(dataDir.resolve("words-en.json"), Language.EN, false);
            int enDaily = loadFile(dataDir.resolve("words-en-daily.json"), Language.EN, true);
            log.info("Word load done: hi={}, hi-daily={}, en={}, en-daily={}", hi, hiDaily, en, enDaily);
            try {
                redis.opsForValue().set(BOOTSTRAP_KEY, "true");
            } catch (Exception redisErr) {
                log.warn("Could not set bootstrap flag (Redis unreachable?): {}", redisErr.getMessage());
            }
        } catch (IOException ex) {
            log.error("Word loading failed", ex);
            throw new IllegalStateException("Word loading failed", ex);
        }
    }

    private int loadFile(Path path, Language lang, boolean dailyPool) throws IOException {
        if (!Files.exists(path)) {
            log.warn("Word file missing: {} — skipping", path);
            return 0;
        }
        List<RawEntry> raws = mapper.readValue(Files.readAllBytes(path),
                new TypeReference<List<RawEntry>>() {});
        Instant now = Instant.now();
        int upserts = 0;
        for (RawEntry raw : raws) {
            String text = AksharaUtil.normalize(lang, raw.text());
            List<String> letters = AksharaUtil.split(lang, text);
            if (letters.size() != 5) {
                log.warn("Rejecting non-5-letter word [{}]: '{}' split={}", lang, text, letters);
                continue;
            }
            String id = makeId(lang, text);
            // Merge with existing: preserve dailyPool=true if either source marks it so.
            boolean mergedDaily = dailyPool;
            var existing = repo.findById(id);
            if (existing.isPresent()) {
                mergedDaily = mergedDaily || existing.get().dailyPool();
            }
            repo.save(new WordDocument(
                    id,
                    lang,
                    text,
                    letters,
                    letters.size(),
                    raw.frequencyRank(),
                    mergedDaily,
                    existing.map(WordDocument::addedAt).orElse(now),
                    path.getFileName().toString()
            ));
            upserts++;
        }
        return upserts;
    }

    private static String makeId(Language lang, String text) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] h = md.digest(text.getBytes(StandardCharsets.UTF_8));
            return lang.code() + ":" + HexFormat.of().formatHex(h).substring(0, 16);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 unavailable", ex);
        }
    }

    public boolean isBootstrapDone() {
        try {
            return "true".equals(redis.opsForValue().get(BOOTSTRAP_KEY));
        } catch (Exception ignored) {
            return false;
        }
    }

    private record RawEntry(String text, Integer frequencyRank) {}

    /** package-private for test usage. */
    static Set<String> bootstrapKeyHolder() { return Set.of(BOOTSTRAP_KEY); }
}
