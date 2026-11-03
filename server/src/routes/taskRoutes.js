
const express = require("express");

const router = express.Router();

const taskController = require("../controllers/taskController");

// Create a task
router.post("/", taskController.createTask);

// Get all tasks for a board
router.get("/", taskController.getTasks);

// Get one task
router.get("/:id", taskController.getTaskById);

// Update task details
router.patch("/:id", taskController.updateTask);

// Delete a task
router.delete("/:id", taskController.deleteTask);

// Move or reorder a task
router.patch("/:id/move", taskController.moveTask);

module.exports = router;
