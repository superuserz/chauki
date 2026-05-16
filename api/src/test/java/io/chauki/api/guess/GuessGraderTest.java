package io.chauki.api.guess;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.chauki.api.guess.dto.LetterStatus;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.TestFactory;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

class GuessGraderTest {

    private final GuessGrader grader = new GuessGrader();

    @TestFactory
    Stream<DynamicTest> sharedCorpus() throws IOException {
        Path corpus = Path.of("..", "data", "grading-tests.json").toAbsolutePath().normalize();
        ObjectMapper mapper = new ObjectMapper();
        List<Case> cases = mapper.readValue(Files.readAllBytes(corpus),
                new TypeReference<List<Case>>() {});
        return cases.stream().map(c -> DynamicTest.dynamicTest(c.name(), () -> {
            List<LetterStatus> got = grader.grade(c.guess(), c.answer());
            List<LetterStatus> expected = c.expected().stream().map(LetterStatus::valueOf).toList();
            assertThat(got).containsExactlyElementsOf(expected);
        }));
    }

    record Case(String name, List<String> answer, List<String> guess, List<String> expected) {}
}
