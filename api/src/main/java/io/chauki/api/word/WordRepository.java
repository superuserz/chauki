package io.chauki.api.word;

import io.chauki.api.puzzle.dto.Language;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface WordRepository extends MongoRepository<WordDocument, String> {

    List<WordDocument> findAllByLang(Language lang);

    List<WordDocument> findAllByLangAndDailyPoolTrue(Language lang);

    List<WordDocument> findAllByLangAndIdNotIn(Language lang, Collection<String> excludedIds);

    Optional<WordDocument> findByLangAndText(Language lang, String text);

    boolean existsByLangAndText(Language lang, String text);

    long countByLang(Language lang);
}
