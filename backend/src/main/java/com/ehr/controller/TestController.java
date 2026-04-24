package com.ehr.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class TestController {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @GetMapping("/test")
    public Map<String, Object> testConnection() {
        Map<String, Object> response = new HashMap<>();
        try {
            // Try a simple query
            Integer result = jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            response.put("status", "SUCCESS");
            response.put("message", "Database connection is working!");
            response.put("result", result);
        } catch (Exception e) {
            response.put("status", "ERROR");
            response.put("message", "Database connection failed");
            // This will show us the REAL error (e.g. "Password failed" or "Timeout")
            response.put("error_detail", e.getMessage());
            if (e.getCause() != null) {
                response.put("cause", e.getCause().getMessage());
            }
        }
        return response;
    }
}
