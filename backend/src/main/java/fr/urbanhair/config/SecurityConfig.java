package fr.urbanhair.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.http.HttpMethod;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.beans.factory.annotation.Value;

@Configuration
public class SecurityConfig {
    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    UserDetailsService adminUserDetailsService(
            PasswordEncoder passwordEncoder,
            @Value("${admin.username:}") String username,
            @Value("${admin.password:}") String password) {
        if (username.isBlank() || password.isBlank()) {
            return requestedUsername -> {
                throw new UsernameNotFoundException("Le compte administrateur n'est pas configuré.");
            };
        }
        if (password.length() < 12) {
            throw new IllegalStateException("ADMIN_PASSWORD doit contenir au moins 12 caractères.");
        }
        return new InMemoryUserDetailsManager(User.withUsername(username)
                .password(passwordEncoder.encode(password))
                .roles("ADMIN")
                .build());
    }

    @Bean
    AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }

    @Bean
    CsrfTokenRepository csrfTokenRepository(
            @Value("${server.servlet.session.cookie.secure:false}") boolean secureCookie) {
        CookieCsrfTokenRepository repository = CookieCsrfTokenRepository.withHttpOnlyFalse();
        repository.setCookiePath("/");
        repository.setCookieCustomizer(cookie -> cookie.secure(secureCookie).sameSite("Lax"));
        return repository;
    }

    @Bean
    SecurityContextRepository securityContextRepository() {
        return new HttpSessionSecurityContextRepository();
    }

    @Bean
    SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            CsrfTokenRepository csrfTokenRepository,
            SecurityContextRepository securityContextRepository) throws Exception {
        http
                .csrf(csrf -> csrf
                        .csrfTokenRepository(csrfTokenRepository)
                        .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler()))
                .cors(org.springframework.security.config.Customizer.withDefaults())
                .securityContext(context -> context.securityContextRepository(securityContextRepository))
                .requestCache(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers("/api/admin/csrf", "/api/admin/login").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/gallery/**").permitAll()
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .anyRequest().permitAll())
                .exceptionHandling(errors -> errors
                        .authenticationEntryPoint((request, response, exception) -> response.sendError(401))
                        .accessDeniedHandler((request, response, exception) -> response.sendError(403)))
                .headers(headers -> headers
                        .contentTypeOptions(options -> {})
                        .frameOptions(frame -> frame.deny()));
        return http.build();
    }
}
