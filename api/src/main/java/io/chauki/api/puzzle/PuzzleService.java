package io.chauki.api.puzzle;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.uuid.Generators;
import io.chauki.api.config.AppProperties;
import io.chauki.api.error.PuzzleNotFoundException;
import io.chauki.api.puzzle.dto.Language;
import io.chauki.api.puzzle.dto.PuzzleMode;
import io.chauki.api.puzzle.dto.PuzzleResponse;
import io.chauki.api.word.WordDocument;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.Collection;

@Service
public class PuzzleService {

    private static final Logger log = LoggerFactory.getLogger(PuzzleService.class);
    private static final Duration PRACTICE_TTL = Duration.ofHours(1);

    private final DailyWordSelector dailySelector;
    private final PracticeWordSelector practiceSelector;
    private final StringRedisTemplate redis;
    private final ObjectMapper mapper;
    private final AppProperties props;

    public PuzzleService(DailyWordSelector dailySelector,
                         PracticeWordSelector practiceSelector,
                         StringRedisTemplate redis,
                         ObjectMapper mapper,
                         AppProperties props) {
        this.dailySelector = dailySelector;
        this.practiceSelector = practiceSelector;
        this.redis = redis;
        this.mapper = mapper;
        this.props = props;
    }

    public PuzzleResponse today(Language lang) {
        LocalDate dateUtc = LocalDate.now(ZoneOffset.UTC);
        String puzzleId = "daily:" + dateUtc + ":" + lang.code();
        String cacheKey = redisKeyDaily(dateUtc, lang);
        CachedPuzzle cached = readCache(cacheKey);
        int dailyNumber = computeDailyNumber(dateUtc);
        if (cached == null) {
            WordDocument w = dailySelector.selectFor(dateUtc, lang);
            cached = new CachedPuzzle(puzzleId, w.id(), w.letters(), lang, PuzzleMode.DAILY, dailyNumber);
            Duration ttl = Duration.between(Instant.now(), nextUtcMidnight()).plusHours(1);
            writeCache(cacheKey, cached, ttl);
        }
        return PuzzleResponse.daily(cached.puzzleId(), lang, cached.letters().size(), dailyNumber, nextUtcMidnight());
    }

    public PuzzleResponse practice(Language lang, Collection<String> excludeRecent) {
        WordDocument w = practiceSelector.pick(lang, excludeRecent);
        String puzzleId = "practice:" + Generators.timeBasedEpochGenerator().generate();
        CachedPuzzle cached = new CachedPuzzle(puzzleId, w.id(), w.letters(), lang, PuzzleMode.PRACTICE, null);
        writeCache(redisKeyPractice(puzzleId), cached, PRACTICE_TTL);
        return PuzzleResponse.practice(puzzleId, lang, cached.letters().size());
    }

    public CachedPuzzle resolve(String puzzleId) {
        if (puzzleId == null || puzzleId.isBlank()) {
            throw new PuzzleNotFoundException(String.valueOf(puzzleId));
        }
        String key = puzzleId.startsWith("practice:")
                ? redisKeyPractice(puzzleId)
                : redisKeyForDaily(puzzleId);
        CachedPuzzle cached = readCache(key);
        if (cached != null) return cached;

        if (puzzleId.startsWith("daily:")) {
            // Daily is reproducible — re-derive on cache miss.
            String[] parts = puzzleId.split(":");
            if (parts.length != 3) throw new PuzzleNotFoundException(puzzleId);
            LocalDate date;
            Language lang;
            try {
                date = LocalDate.parse(parts[1]);
                lang = Language.fromCode(parts[2]);
            } catch (Exception ex) {
                throw new PuzzleNotFoundException(puzzleId);
            }
            today(lang); // populates cache
            CachedPuzzle reread = readCache(redisKeyDaily(date, lang));
            if (reread != null) return reread;
        }
        throw new PuzzleNotFoundException(puzzleId);
    }

    private int computeDailyNumber(LocalDate today) {
        if (props.launchDate() == null) return 1;
        long days = ChronoUnit.DAYS.between(props.launchDate(), today);
        return (int) Math.max(1, days + 1);
    }

    private static Instant nextUtcMidnight() {
        return LocalDate.now(ZoneOffset.UTC).plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();
    }

    private static String redisKeyDaily(LocalDate date, Language lang) {
        return "chauki:puzzle:daily:" + date + ":" + lang.code();
    }

    private static String redisKeyPractice(String puzzleId) {
        return "chauki:puzzle:practice:" + puzzleId.replaceFirst("^practice:", "");
    }

    private static String redisKeyForDaily(String puzzleId) {
        // puzzleId format: daily:YYYY-MM-DD:lang
        return "chauki:puzzle:" + puzzleId;
    }

    private CachedPuzzle readCache(String key) {
        try {
            String raw = redis.opsForValue().get(key);
            return raw == null ? null : mapper.readValue(raw, CachedPuzzle.class);
        } catch (Exception ex) {
            log.warn("Cache read failed for {}: {}", key, ex.getMessage());
            return null;
        }
    }

    private void writeCache(String key, CachedPuzzle value, Duration ttl) {
        try {
            redis.opsForValue().set(key, mapper.writeValueAsString(value), ttl);
        } catch (JsonProcessingException ex) {
            log.warn("Cache write serialize failed: {}", ex.getMessage());
        } catch (Exception ex) {
            log.warn("Cache write failed for {}: {}", key, ex.getMessage());
        }
    }
}
