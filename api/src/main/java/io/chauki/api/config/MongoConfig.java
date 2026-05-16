package io.chauki.api.config;

import io.chauki.api.puzzle.dto.Language;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.data.convert.ReadingConverter;
import org.springframework.data.convert.WritingConverter;
import org.springframework.data.mongodb.core.convert.MongoCustomConversions;

import java.util.List;

@Configuration
public class MongoConfig {

    @Bean
    public MongoCustomConversions mongoCustomConversions() {
        return new MongoCustomConversions(List.of(
                new LanguageReadConverter(),
                new LanguageWriteConverter()
        ));
    }

    @ReadingConverter
    static class LanguageReadConverter implements Converter<String, Language> {
        @Override
        public Language convert(String source) {
            return Language.fromCode(source);
        }
    }

    @WritingConverter
    static class LanguageWriteConverter implements Converter<Language, String> {
        @Override
        public String convert(Language source) {
            return source.code();
        }
    }
}
