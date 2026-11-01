package fr.urbanhair.storage;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.stream.Stream;
import java.util.UUID;

public class LocalImageStorage implements ImageStorage {
    private final Path directory;

    public LocalImageStorage(String directory) {
        Path configuredDirectory = Path.of(directory).toAbsolutePath().normalize();
        Path projectBackendDirectory = Path.of("backend").resolve(directory).toAbsolutePath().normalize();
        this.directory = usesDefaultRelativeDirectory(directory)
                && !containsImages(configuredDirectory)
                && containsImages(projectBackendDirectory)
                ? projectBackendDirectory
                : configuredDirectory;
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

    private boolean usesDefaultRelativeDirectory(String path) {
        return !Path.of(path).isAbsolute()
                && (path.equals("./data/images") || path.equals("data/images"));
    }

    private boolean containsImages(Path path) {
        if (!Files.isDirectory(path)) return false;
        try (Stream<Path> files = Files.list(path)) {
            return files.anyMatch(file -> file.getFileName().toString().matches("[a-f0-9-]{36}\\.jpg"));
        } catch (IOException exception) {
            return false;
        }
    }
}
