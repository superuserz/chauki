package io.chauki.api.word;

import io.chauki.api.puzzle.dto.Language;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class AksharaUtil {

    private static final Pattern AKSHARA = Pattern.compile(
            "(?:[\\u0915-\\u0939\\u093C](?:\\u094D[\\u0915-\\u0939])*[\\u093E-\\u094C]?[\\u0902\\u0903]?)" +
            "|[\\u0905-\\u0914][\\u0902\\u0903]?" +
            "|."
    );

    private AksharaUtil() {}

    public static List<String> splitHindi(String word) {
        if (word == null) return List.of();
        String normalized = Normalizer.normalize(word, Normalizer.Form.NFC);
        List<String> out = new ArrayList<>();
        Matcher m = AKSHARA.matcher(normalized);
        while (m.find()) {
            String s = m.group();
            if (!s.isBlank()) out.add(s);
        }
        return out;
    }

    public static List<String> splitEnglish(String word) {
        if (word == null) return List.of();
        String lowered = word.toLowerCase();
        List<String> out = new ArrayList<>(lowered.length());
        for (int i = 0; i < lowered.length(); i++) {
            out.add(String.valueOf(lowered.charAt(i)));
        }
        return out;
    }

    public static List<String> split(Language lang, String word) {
        return lang == Language.HI ? splitHindi(word) : splitEnglish(word);
    }

    public static String normalize(Language lang, String word) {
        if (word == null) return "";
        return lang == Language.HI
                ? Normalizer.normalize(word, Normalizer.Form.NFC)
                : word.toLowerCase();
    }
}
