package com.ehr.controller;

import com.ehr.model.Doctor;
import com.ehr.model.Department;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class DoctorController {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @GetMapping("/doctors")
    public List<Doctor> getDoctors() {
        String sql = "SELECT d.doctor_id, d.name, d.phone, d.speciality, d.dept_id, dept.dept_name " +
                     "FROM doctor d LEFT JOIN department dept ON d.dept_id = dept.dept_id " +
                     "ORDER BY d.name";
        
        return jdbcTemplate.query(sql, (rs, rowNum) -> {
            Doctor doctor = new Doctor();
            doctor.setDoctorId((UUID) rs.getObject("doctor_id"));
            doctor.setName(rs.getString("name"));
            doctor.setPhone(rs.getString("phone"));
            doctor.setSpeciality(rs.getString("speciality"));
            doctor.setDeptId((UUID) rs.getObject("dept_id"));
            doctor.setDepartmentName(rs.getString("dept_name"));
            return doctor;
        });
    }

    @GetMapping("/departments")
    public List<Department> getDepartments() {
        String sql = "SELECT dept_id, dept_name, location FROM department ORDER BY dept_name";
        
        return jdbcTemplate.query(sql, (rs, rowNum) -> {
            Department dept = new Department();
            dept.setDeptId((UUID) rs.getObject("dept_id"));
            dept.setDeptName(rs.getString("dept_name"));
            dept.setLocation(rs.getString("location"));
            return dept;
        });
    }

    @PostMapping("/doctors")
    public void addDoctor(@RequestBody Doctor doctor) {
        String sql = "INSERT INTO doctor (name, phone, speciality, dept_id) VALUES (?, ?, ?, ?)";
        jdbcTemplate.update(sql, doctor.getName(), doctor.getPhone(), doctor.getSpeciality(), doctor.getDeptId());
    }

    @PutMapping("/doctors/{id}")
    public void updateDoctor(@PathVariable UUID id, @RequestBody Doctor doctor) {
        String sql = "UPDATE doctor SET name = ?, phone = ?, speciality = ?, dept_id = ? WHERE doctor_id = ?";
        jdbcTemplate.update(sql, doctor.getName(), doctor.getPhone(), doctor.getSpeciality(), doctor.getDeptId(), id);
    }

    @DeleteMapping("/doctors/{id}")
    public void deleteDoctor(@PathVariable UUID id) {
        String sql = "DELETE FROM doctor WHERE doctor_id = ?";
        jdbcTemplate.update(sql, id);
    }
}
