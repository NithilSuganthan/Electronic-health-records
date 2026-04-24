package com.ehr.model;

import java.util.UUID;

public class Department {
    private UUID deptId;
    private String deptName;
    private String location;

    // Constructors
    public Department() {}

    public Department(UUID deptId, String deptName, String location) {
        this.deptId = deptId;
        this.deptName = deptName;
        this.location = location;
    }

    // Getters and Setters
    public UUID getDeptId() { return deptId; }
    public void setDeptId(UUID deptId) { this.deptId = deptId; }

    public String getDeptName() { return deptName; }
    public void setDeptName(String deptName) { this.deptName = deptName; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
}
