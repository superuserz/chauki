package io.chauki.api.config;

import io.chauki.api.puzzle.dto.Language;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.format.FormatterRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Override
    public void addFormatters(FormatterRegistry registry) {
        registry.addConverter(new StringToLanguageConverter());
    }

    static class StringToLanguageConverter implements Converter<String, Language> {
        @Override
        public Language convert(String source) {
            return Language.fromCode(source);
        }
    }
}
