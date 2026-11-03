
const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    boardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Board",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      minlength: [1, "Task title cannot be empty"],
      maxlength: [120, "Task title cannot exceed 120 characters"],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [2000, "Description cannot exceed 2000 characters"],
      default: "",
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
      required: true,
    },

    columnId: {
      type: String,
      enum: ["todo", "inprogress", "done"],
      default: "todo",
      required: true,
    },

    orderIndex: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "orderIndex must be an integer",
      },
    },

    tags: {
      type: [String],
      default: [],
      validate: {
        validator: (tags) =>
          tags.length <= 10 &&
          tags.every((tag) => tag.trim().length > 0 && tag.length <= 30),
        message: "A task can have at most 10 valid tags",
      },
    },
  },
  {
    timestamps: true,
  }
);

// Efficiently retrieve tasks in board-column order.
taskSchema.index({
  boardId: 1,
  columnId: 1,
  orderIndex: 1,
});

// Efficiently filter tasks by priority.
taskSchema.index({
  boardId: 1,
  priority: 1,
});

const Task = mongoose.model("Task", taskSchema);

module.exports = Task;
