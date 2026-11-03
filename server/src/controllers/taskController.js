
const mongoose = require("mongoose");

const taskService = require("../services/taskService");

// Validate MongoDB ObjectId
const validateObjectId = (id, fieldName) => {
  if (!mongoose.isValidObjectId(id)) {
    const error = new Error(`Invalid ${fieldName}`);
    error.statusCode = 400;
    throw error;
  }
};

// Create task

const createTask = async (req, res) => {
  const {
    boardId,
    title,
    description,
    priority,
    columnId,
    tags,
    expectedRevision,
  } = req.body;

  validateObjectId(boardId, "Board ID");

  if (!title || typeof title !== "string" || !title.trim()) {
    return res.status(400).json({
      success: false,
      message: "Task title is required",
    });
  }

  if (!Number.isInteger(expectedRevision) || expectedRevision < 0) {
    return res.status(400).json({
      success: false,
      message: "A valid expectedRevision is required",
    });
  }

  const result = await taskService.createTask(
    {
      boardId,
      title,
      description,
      priority,
      columnId,
      tags,
    },
    expectedRevision
  );

  res.status(201).json({
    success: true,
    message: "Task created successfully",
    data: result.task,
    revision: result.revision,
  });
};


// Get all tasks
const getTasks = async (req, res) => {
  const { boardId } = req.query;

  validateObjectId(boardId, "board ID");

  const tasks = await taskService.getTasks(boardId);

  res.status(200).json({
    success: true,
    count: tasks.length,
    data: tasks,
  });
};

// Get one task
const getTaskById = async (req, res) => {
  const { id } = req.params;
  const { boardId } = req.query;

  validateObjectId(id, "task ID");
  validateObjectId(boardId, "board ID");

  const task = await taskService.getTaskById(id, boardId);

  if (!task) {
    return res.status(404).json({
      success: false,
      message: "Task not found",
    });
  }

  res.status(200).json({
    success: true,
    data: task,
  });
};

// Update task

const updateTask = async (req, res) => {
  const { id } = req.params;
  const { boardId } = req.query;
  const { expectedRevision, ...updates } = req.body;

  validateObjectId(id, "Task ID");
  validateObjectId(boardId, "Board ID");

  if (!Number.isInteger(expectedRevision) || expectedRevision < 0) {
    return res.status(400).json({
      success: false,
      message: "A valid expectedRevision is required",
    });
  }

  const result = await taskService.updateTask(
    id,
    boardId,
    updates,
    expectedRevision
  );

  res.status(200).json({
    success: true,
    message: "Task updated successfully",
    data: result.task,
    revision: result.revision,
  });
};


// Delete task

const deleteTask = async (req, res) => {
  const { id } = req.params;
  const { boardId, expectedRevision } = req.query;

  validateObjectId(id, "Task ID");
  validateObjectId(boardId, "Board ID");

  const revision = Number(expectedRevision);

  if (
    expectedRevision === undefined ||
    expectedRevision.trim() === "" ||
    !Number.isInteger(revision) ||
    revision < 0
  ) {
    return res.status(400).json({
      success: false,
      message: "A valid expectedRevision is required",
    });
  }

  const result = await taskService.deleteTask(
    id,
    boardId,
    revision
  );

  res.status(200).json({
    success: true,
    message: "Task deleted successfully",
    data: result.task,
    revision: result.revision,
  });
};

// Move or reorder task
const moveTask = async (req, res) => {
  const { id } = req.params;

  const {
    boardId,
    targetColumnId,
    destinationIndex,
    expectedRevision,
  } = req.body;

  validateObjectId(id, "task ID");
  validateObjectId(boardId, "board ID");

  const validColumns = ["todo", "inprogress", "done"];

  if (!validColumns.includes(targetColumnId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid target column",
    });
  }

  if (
    !Number.isInteger(destinationIndex) ||
    destinationIndex < 0
  ) {
    return res.status(400).json({
      success: false,
      message: "destinationIndex must be a non-negative integer",
    });
  }

  if (
    !Number.isInteger(expectedRevision) ||
    expectedRevision < 0
  ) {
    return res.status(400).json({
      success: false,
      message: "A valid expectedRevision is required",
    });
  }

  const result = await taskService.moveTask({
    taskId: id,
    boardId,
    targetColumnId,
    destinationIndex,
    expectedRevision,
  });

  res.status(200).json({
    success: true,
    message: "Task moved successfully",
    data: result,
  });
};

module.exports = {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  moveTask,
};
