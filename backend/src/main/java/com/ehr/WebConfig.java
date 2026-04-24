package com.ehr;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${cors.allowed.origins:http://localhost:5173}")
    private String allowedOrigins;

    @Override
    @SuppressWarnings("null")
    public void addCorsMappings(@NonNull CorsRegistry registry) {
        // Split comma-separated origins if provided
        String[] origins = (allowedOrigins != null && !allowedOrigins.isBlank())
            ? allowedOrigins.split(",")
            : new String[]{"http://localhost:5173", "https://electronic-health-records-xi.vercel.app"};

        registry.addMapping("/api/**")
                .allowedOriginPatterns(origins) // Use allowedOriginPatterns for better flexibility with credentials
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }
}
