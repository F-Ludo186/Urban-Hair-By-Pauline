package fr.urbanhair.storage;

import java.net.URI;
import java.net.URISyntaxException;

public final class ExternalImageUrl {
    private static final String INVALID_URL_MESSAGE = "Saisissez une URL d’image HTTPS valide.";

    private ExternalImageUrl() {}

    public static String normalize(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            URI uri = new URI(value.trim());
            if (!uri.isAbsolute()
                    || !"https".equalsIgnoreCase(uri.getScheme())
                    || uri.getHost() == null
                    || uri.getUserInfo() != null) {
                throw new IllegalArgumentException(INVALID_URL_MESSAGE);
            }
            return uri.toASCIIString();
        } catch (URISyntaxException exception) {
            throw new IllegalArgumentException(INVALID_URL_MESSAGE, exception);
        }
    }
}
