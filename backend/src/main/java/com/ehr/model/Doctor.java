package com.ehr.model;

import java.util.UUID;

public class Doctor {
    private UUID doctorId;
    private String name;
    private String phone;
    private String speciality;
    private UUID deptId;
    private String departmentName; // For convenience in frontend

    // Constructors
    public Doctor() {}

    public Doctor(UUID doctorId, String name, String phone, String speciality, UUID deptId, String departmentName) {
        this.doctorId = doctorId;
        this.name = name;
        this.phone = phone;
        this.speciality = speciality;
        this.deptId = deptId;
        this.departmentName = departmentName;
    }

    // Getters and Setters
    public UUID getDoctorId() { return doctorId; }
    public void setDoctorId(UUID doctorId) { this.doctorId = doctorId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getSpeciality() { return speciality; }
    public void setSpeciality(String speciality) { this.speciality = speciality; }

    public UUID getDeptId() { return deptId; }
    public void setDeptId(UUID deptId) { this.deptId = deptId; }

    public String getDepartmentName() { return departmentName; }
    public void setDepartmentName(String departmentName) { this.departmentName = departmentName; }
}
