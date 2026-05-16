package io.chauki.api.error;

import org.springframework.http.HttpStatus;

public class InvalidGuessFormatException extends ApiException {
    public InvalidGuessFormatException(String message) {
        super(ErrorCode.INVALID_GUESS_FORMAT, HttpStatus.BAD_REQUEST, message);
    }
}
