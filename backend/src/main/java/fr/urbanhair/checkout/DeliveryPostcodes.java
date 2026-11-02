package fr.urbanhair.checkout;

public final class DeliveryPostcodes {
    private DeliveryPostcodes() {}

    public static boolean isValid(String prefixes) {
        if (prefixes == null || prefixes.isBlank()) return false;
        for (String part : prefixes.split(",")) {
            String[] bounds = part.trim().split("-", -1);
            try {
                if (bounds.length < 1 || bounds.length > 2
                        || !bounds[0].matches("\\d{2}")
                        || (bounds.length == 2 && !bounds[1].matches("\\d{2}"))) return false;
                int first = Integer.parseInt(bounds[0]);
                int last = bounds.length == 1 ? first : Integer.parseInt(bounds[1]);
                if (first > last) return false;
            } catch (NumberFormatException exception) {
                return false;
            }
        }
        return true;
    }

    public static boolean contains(String postalCode, String prefixes) {
        if (postalCode == null || !postalCode.matches("\\d{5}") || !isValid(prefixes)) return false;
        int code = Integer.parseInt(postalCode.substring(0, 2));
        for (String part : prefixes.split(",")) {
            String[] bounds = part.trim().split("-", -1);
            int first = Integer.parseInt(bounds[0]);
            int last = bounds.length == 1 ? first : Integer.parseInt(bounds[1]);
            if (code >= first && code <= last) return true;
        }
        return false;
    }
}
