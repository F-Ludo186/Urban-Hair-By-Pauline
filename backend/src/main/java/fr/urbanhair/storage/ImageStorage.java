package fr.urbanhair.storage;

public interface ImageStorage {
    String store(byte[] image);
    byte[] load(String key);
    void delete(String key);
}
