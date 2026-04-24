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
            // A simple query to check the database connection
            // It queries the Doctor table created in your supabase_schema.sql
            Integer doctorCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM doctor", Integer.class);
            
            response.put("status", "SUCCESS");
            response.put("message", "Connected to Supabase PostgreSQL successfully!");
            response.put("doctorCount", doctorCount);
        } catch (Exception e) {
            response.put("status", "ERROR");
            response.put("message", "Failed to connect to the database: " + e.getMessage());
        }
        return response;
    }
}
