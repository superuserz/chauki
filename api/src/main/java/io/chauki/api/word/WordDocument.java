package io.chauki.api.word;

import io.chauki.api.puzzle.dto.Language;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

@Document(collection = "words")
@CompoundIndex(name = "lang_text_unique", def = "{ 'lang': 1, 'text': 1 }", unique = true)
@CompoundIndex(name = "lang_dailyPool", def = "{ 'lang': 1, 'dailyPool': 1 }")
public record WordDocument(
        @Id String id,
        @Indexed Language lang,
        String text,
        List<String> letters,
        int length,
        Integer frequencyRank,
        boolean dailyPool,
        Instant addedAt,
        String sourceList
) {}
