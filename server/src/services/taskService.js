
const mongoose = require("mongoose");

const Task = require("../models/Task");
const Board = require("../models/Board");


// Create a new task with optimistic concurrency control
const createTask = async (taskData, expectedRevision) => {
  const session = await mongoose.startSession();

  try {
    let createdTask;

    await session.withTransaction(async () => {
      // Atomically claim the expected board revision.
      const revisionUpdate = await Board.updateOne(
        {
          _id: taskData.boardId,
          revision: expectedRevision,
        },
        {
          $inc: { revision: 1 },
        },
        { session }
      );

      // Reject requests based on stale board state.
      if (revisionUpdate.matchedCount !== 1) {
        const error = new Error(
          "Board has changed. Please refresh and try again."
        );
        error.statusCode = 409;
        throw error;
      }

      const board = await Board.findById(taskData.boardId).session(session);

      if (!board) {
        const error = new Error("Board not found");
        error.statusCode = 404;
        throw error;
      }

      const columnId = taskData.columnId || "todo";

      // Find the last task to calculate the next position.
      const lastTask = await Task.findOne({
        boardId: board._id,
        columnId,
      })
        .sort({ orderIndex: -1 })
        .session(session);

      const orderIndex = lastTask ? lastTask.orderIndex + 1 : 0;

      // Insert the task inside the same transaction.
      [createdTask] = await Task.create(
        [
          {
            ...taskData,
            boardId: board._id,
            columnId,
            orderIndex,
          },
        ],
        { session }
      );
    });

    return {
      task: createdTask,
      revision: expectedRevision + 1,
    };
  } finally {
    await session.endSession();
  }
};


// Get all tasks for a board
const getTasks = async (boardId) => {
  return Task.find({ boardId })
    .sort({ columnId: 1, orderIndex: 1, _id: 1 })
    .lean();
};

// Get a single task
const getTaskById = async (taskId, boardId) => {
  return Task.findOne({
    _id: taskId,
    boardId,
  }).lean();
};


const updateTask = async (taskId, boardId, updates, expectedRevision) => {
  const allowedFields = ["title", "description", "priority", "tags"];
  const safeUpdates = {};

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      safeUpdates[field] = updates[field];
    }
  }

  if (Object.keys(safeUpdates).length === 0) {
    const error = new Error("No valid fields provided for update");
    error.statusCode = 400;
    throw error;
  }

  const session = await mongoose.startSession();

  try {
    let updatedTask;

    await session.withTransaction(async () => {
      // Check and increment the board revision atomically.
      const revisionUpdate = await Board.updateOne(
        {
          _id: boardId,
          revision: expectedRevision,
        },
        {
          $inc: { revision: 1 },
        },
        { session }
      );

      if (revisionUpdate.matchedCount !== 1) {
        const error = new Error(
          "Board has changed. Please refresh and try again."
        );
        error.statusCode = 409;
        throw error;
      }

      // Confirm that the task belongs to this board.
      const task = await Task.findOne({
        _id: taskId,
        boardId,
      }).session(session);

      if (!task) {
        const error = new Error("Task not found");
        error.statusCode = 404;
        throw error;
      }

      updatedTask = await Task.findOneAndUpdate(
        { _id: taskId, boardId },
        { $set: safeUpdates },
        {
          new: true,
          runValidators: true,
          session,
        }
      );
    });

    return {
      task: updatedTask,
      revision: expectedRevision + 1,
    };
  } finally {
    await session.endSession();
  }
};


// Delete task and normalize positions

const deleteTask = async (taskId, boardId, expectedRevision) => {
  const session = await mongoose.startSession();

  try {
    let deletedTask;

    await session.withTransaction(async () => {
      // Atomically verify and increment the board revision.
      const revisionUpdate = await Board.updateOne(
        {
          _id: boardId,
          revision: expectedRevision,
        },
        {
          $inc: { revision: 1 },
        },
        { session }
      );

      if (revisionUpdate.matchedCount !== 1) {
        const error = new Error(
          "Board has changed. Please refresh and try again."
        );
        error.statusCode = 409;
        throw error;
      }

      // Find the task before deleting it.
      const task = await Task.findOne({
        _id: taskId,
        boardId,
      }).session(session);

      if (!task) {
        const error = new Error("Task not found");
        error.statusCode = 404;
        throw error;
      }

      // Delete the task.
      deletedTask = await Task.findOneAndDelete(
        { _id: taskId, boardId },
        { session }
      );

      // Close the gap in the remaining task positions.
      await Task.updateMany(
        {
          boardId,
          columnId: task.columnId,
          orderIndex: { $gt: task.orderIndex },
        },
        {
          $inc: { orderIndex: -1 },
        },
        { session }
      );
    });

    return {
      task: deletedTask,
      revision: expectedRevision + 1,
    };
  } finally {
    await session.endSession();
  }
};


const moveTask = async ({
  taskId,
  boardId,
  targetColumnId,
  destinationIndex,
  expectedRevision,
}) => {
  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      // 1. Atomically claim the expected board revision.
      const revisionUpdate = await Board.updateOne(
        {
          _id: boardId,
          revision: expectedRevision,
        },
        {
          $inc: { revision: 1 },
        },
        { session }
      );

      // 2. Reject outdated clients.
      if (revisionUpdate.matchedCount !== 1) {
        const error = new Error(
          "Board has changed. Please refresh and try again."
        );
        error.statusCode = 409;
        throw error;
      }

      // 3. Find the task being moved.
      const movingTask = await Task.findOne({
        _id: taskId,
        boardId,
      }).session(session);

      if (!movingTask) {
        const error = new Error("Task not found");
        error.statusCode = 404;
        throw error;
      }

      // 4. Read the source and destination columns.
      const columnIds = [
        ...new Set([movingTask.columnId, targetColumnId]),
      ];

      const affectedTasks = await Task.find({
        boardId,
        columnId: { $in: columnIds },
      })
        .sort({ orderIndex: 1, _id: 1 })
        .session(session);

      // 5. Separate the columns.
      const columns = {
        [movingTask.columnId]: [],
        [targetColumnId]: [],
      };

      for (const task of affectedTasks) {
        if (task._id.equals(movingTask._id)) {
          continue;
        }

        columns[task.columnId].push(task);
      }

      // 6. Insert the moving task at its destination.
      const destinationTasks = columns[targetColumnId];

      const safeIndex = Math.max(
        0,
        Math.min(
          destinationIndex,
          destinationTasks.length
        )
      );

      destinationTasks.splice(safeIndex, 0, movingTask);

      // 7. Recalculate positions in both columns.
      const bulkOperations = [];

      for (const columnId of columnIds) {
        const tasks = columns[columnId];

        tasks.forEach((task, index) => {
          bulkOperations.push({
            updateOne: {
              filter: {
                _id: task._id,
                boardId,
              },
              update: {
                $set: {
                  columnId,
                  orderIndex: index,
                },
              },
            },
          });
        });
      }

      // 8. Persist all ordering changes.
      if (bulkOperations.length > 0) {
        await Task.bulkWrite(bulkOperations, { session });
      }

      // 9. Return the updated task and new revision.
      const updatedTasks = await Task.find({
  boardId,
  columnId: { $in: columnIds },
})
  .sort({ columnId: 1, orderIndex: 1, _id: 1 })
  .session(session)
  .lean();

result = {
  taskId: movingTask._id,
  sourceColumnId: movingTask.columnId,
  targetColumnId,
  affectedColumnIds: columnIds,
  orderIndex: safeIndex,
  revision: expectedRevision + 1,
  tasks: updatedTasks,
};
    });

    return result;
  } finally {
    await session.endSession();
  }
};


module.exports = {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  moveTask,
};