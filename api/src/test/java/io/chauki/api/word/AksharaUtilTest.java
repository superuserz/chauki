package io.chauki.api.word;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.TestFactory;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

class AksharaUtilTest {

    @TestFactory
    Stream<DynamicTest> sharedCorpus() throws IOException {
        Path corpus = Path.of("..", "data", "akshara-tests.json").toAbsolutePath().normalize();
        ObjectMapper mapper = new ObjectMapper();
        List<Case> cases = mapper.readValue(Files.readAllBytes(corpus),
                new TypeReference<List<Case>>() {});
        return cases.stream().map(c -> DynamicTest.dynamicTest(
                "splitHindi(" + c.word() + ") == " + c.expected(),
                () -> assertThat(AksharaUtil.splitHindi(c.word())).containsExactlyElementsOf(c.expected())
        ));
    }

    record Case(String word, List<String> expected) {}
}
