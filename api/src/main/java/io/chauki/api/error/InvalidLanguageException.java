package io.chauki.api.error;

import org.springframework.http.HttpStatus;

public class InvalidLanguageException extends ApiException {
    public InvalidLanguageException(String raw) {
        super(ErrorCode.INVALID_LANGUAGE, HttpStatus.BAD_REQUEST,
              "Unsupported language: " + raw + " (expected 'hi' or 'en')");
    }
}
