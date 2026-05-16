package io.chauki.api.error;

import org.springframework.http.HttpStatus;

public class InvalidWordException extends ApiException {
    public InvalidWordException(String message) {
        super(ErrorCode.INVALID_WORD, HttpStatus.BAD_REQUEST, message);
    }
}
