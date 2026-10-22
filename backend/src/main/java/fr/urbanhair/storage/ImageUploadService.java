package fr.urbanhair.storage;

import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Iterator;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ImageUploadService {
    private static final long MAX_BYTES = 10 * 1024 * 1024;
    private static final int MAX_DIMENSION = 8000;
    private static final long MAX_PIXELS = 40_000_000;
    private static final int OUTPUT_DIMENSION = 1800;
    private final ImageStorage storage;

    public ImageUploadService(ImageStorage storage) {
        this.storage = storage;
    }

    public String store(MultipartFile file) {
        if (file == null || file.isEmpty() || file.getSize() > MAX_BYTES) {
            throw new IllegalArgumentException("Choisissez une image JPG ou PNG de 10 Mo maximum.");
        }
        try (InputStream stream = file.getInputStream();
                ImageInputStream input = ImageIO.createImageInputStream(stream)) {
            if (input == null) {
                throw new IllegalArgumentException("Le fichier image ne peut pas être lu.");
            }
            Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) {
                throw new IllegalArgumentException("Seules les images JPG et PNG sont acceptées.");
            }
            ImageReader reader = readers.next();
            try {
                reader.setInput(input, true, true);
                String format = reader.getFormatName();
                int width = reader.getWidth(0);
                int height = reader.getHeight(0);
                if (!(format.equalsIgnoreCase("JPEG") || format.equalsIgnoreCase("JPG") || format.equalsIgnoreCase("PNG"))
                        || width < 1 || height < 1 || width > MAX_DIMENSION || height > MAX_DIMENSION
                        || (long) width * height > MAX_PIXELS) {
                    throw new IllegalArgumentException("Format ou dimensions d'image non acceptés.");
                }
                BufferedImage decoded = reader.read(0);
                if (decoded == null) {
                    throw new IllegalArgumentException("Le fichier image est invalide.");
                }
                return storage.store(encodeJpeg(decoded));
            } finally {
                reader.dispose();
            }
        } catch (IOException exception) {
            throw new IllegalArgumentException("Impossible de lire cette image.", exception);
        }
    }

    public byte[] load(String key) {
        return storage.load(key);
    }

    public void delete(String key) {
        storage.delete(key);
    }

    private byte[] encodeJpeg(BufferedImage source) throws IOException {
        double scale = Math.min(1.0, (double) OUTPUT_DIMENSION / Math.max(source.getWidth(), source.getHeight()));
        int width = Math.max(1, (int) Math.round(source.getWidth() * scale));
        int height = Math.max(1, (int) Math.round(source.getHeight() * scale));
        BufferedImage output = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = output.createGraphics();
        graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        graphics.drawImage(source, 0, 0, width, height, java.awt.Color.WHITE, null);
        graphics.dispose();
        try (ByteArrayOutputStream bytes = new ByteArrayOutputStream()) {
            if (!ImageIO.write(output, "jpg", bytes)) {
                throw new IOException("Aucun encodeur JPEG disponible.");
            }
            return bytes.toByteArray();
        }
    }
}
