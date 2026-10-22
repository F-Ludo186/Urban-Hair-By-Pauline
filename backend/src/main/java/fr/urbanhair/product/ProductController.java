package fr.urbanhair.product;

import java.math.BigDecimal;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/products")
public class ProductController {
    private final List<Product> products = List.of(
            new Product("rituel-nourrissant", "Rituel nourrissant", "Soin · Cheveux secs", "Un soin riche pour nourrir les longueurs.", new BigDecimal("32.00"), "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=900&q=80"),
            new Product("shampooing-douceur", "Shampooing douceur", "Lavage · Tous types", "Une base douce pour le rituel quotidien.", new BigDecimal("24.00"), "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=900&q=80"),
            new Product("huile-finition", "Huile de finition", "Coiffage · Brillance", "Quelques gouttes pour des longueurs lumineuses.", new BigDecimal("28.00"), "https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?auto=format&fit=crop&w=900&q=80")
    );

    @GetMapping
    public List<Product> getProducts() {
        return products;
    }
}
