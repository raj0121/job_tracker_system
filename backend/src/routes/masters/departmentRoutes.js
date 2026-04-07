import express from "express";
import {
  createDepartment,
  deleteDepartment,
  getDepartments,
  updateDepartment
} from "../../controllers/masters/departmentController.js";
import {
  createDesignation,
  deleteDesignation,
  getDesignations,
  updateDesignation
} from "../../controllers/masters/designationController.js";
import {
  createEmployee,
  deleteEmployee,
  getEmployees,
  updateEmployee
} from "../../controllers/masters/employeeController.js";
import { protect } from "../../middleware/auth.middleware.js";
import { authorizePermission } from "../../middleware/role.middleware.js";

const router = express.Router();

router.use(protect);

router.get("/departments", authorizePermission("masters:read:any"), getDepartments);
router.post("/departments", authorizePermission("masters:write:any"), createDepartment);
router.patch("/departments/:departmentId", authorizePermission("masters:write:any"), updateDepartment);
router.delete("/departments/:departmentId", authorizePermission("masters:write:any"), deleteDepartment);

router.get("/designations", authorizePermission("masters:read:any"), getDesignations);
router.post("/designations", authorizePermission("masters:write:any"), createDesignation);
router.patch("/designations/:designationId", authorizePermission("masters:write:any"), updateDesignation);
router.delete("/designations/:designationId", authorizePermission("masters:write:any"), deleteDesignation);

router.get("/employees", authorizePermission("masters:read:any"), getEmployees);
router.post("/employees", authorizePermission("masters:write:any"), createEmployee);
router.patch("/employees/:employeeId", authorizePermission("masters:write:any"), updateEmployee);
router.delete("/employees/:employeeId", authorizePermission("masters:write:any"), deleteEmployee);

export default router;
