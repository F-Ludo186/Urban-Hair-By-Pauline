package fr.urbanhair.storage;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.UUID;

public class LocalImageStorage implements ImageStorage {
    private final Path directory;

    public LocalImageStorage(String directory) {
        this.directory = Path.of(directory).toAbsolutePath().normalize();
    }

    @Override
    public String store(byte[] image) {
        String key = UUID.randomUUID() + ".jpg";
        try {
            Files.createDirectories(directory);
            Files.write(directory.resolve(key), image, StandardOpenOption.CREATE_NEW);
            return key;
        } catch (IOException exception) {
            throw new IllegalStateException("Impossible d'enregistrer l'image.", exception);
        }
    }

    @Override
    public byte[] load(String key) {
        Path file = resolve(key);
        try {
            return Files.readAllBytes(file);
        } catch (IOException exception) {
            throw new ImageNotFoundException();
        }
    }

    @Override
    public void delete(String key) {
        try {
            Files.deleteIfExists(resolve(key));
        } catch (IOException exception) {
            throw new IllegalStateException("Impossible de supprimer l'image.", exception);
        }
    }

    private Path resolve(String key) {
        if (key == null || !key.matches("[a-f0-9-]{36}\\.jpg")) {
            throw new ImageNotFoundException();
        }
        Path file = directory.resolve(key).normalize();
        if (!file.startsWith(directory)) {
            throw new ImageNotFoundException();
        }
        return file;
    }
}
