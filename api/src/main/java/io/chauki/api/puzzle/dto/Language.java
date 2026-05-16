package io.chauki.api.puzzle.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import io.chauki.api.error.InvalidLanguageException;

public enum Language {
    HI("hi"),
    EN("en");

    private final String code;

    Language(String code) {
        this.code = code;
    }

    @JsonValue
    public String code() {
        return code;
    }

    @JsonCreator
    public static Language fromCode(String code) {
        if (code == null) throw new InvalidLanguageException("null");
        for (Language l : values()) {
            if (l.code.equalsIgnoreCase(code)) return l;
        }
        throw new InvalidLanguageException(code);
    }
}
