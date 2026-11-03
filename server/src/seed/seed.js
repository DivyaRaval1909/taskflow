
require("dotenv").config();

const mongoose = require("mongoose");

const connectDB = require("../config/db");
const Board = require("../models/Board");
const Task = require("../models/Task");

const seedDatabase = async () => {
  try {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Seeding is disabled in production.");
    }

    await connectDB();

    console.log("Clearing existing TaskFlow data...");

    await Task.deleteMany({});
    await Board.deleteMany({});

    // Create the sample board
    const board = await Board.create({
      name: "TaskFlow Development Board",
      revision: 0,
    });

    // Sample tasks distributed across all three columns
    const sampleTasks = [
      // TO DO
      {
        title: "Implement JWT Authentication",
        description: "Build secure login and token validation.",
        priority: "high",
        columnId: "todo",
        tags: ["backend", "security"],
      },
      {
        title: "Design Dashboard UI",
        description: "Create a clean and responsive dashboard.",
        priority: "medium",
        columnId: "todo",
        tags: ["frontend", "design"],
      },
      {
        title: "Write API Documentation",
        description: "Document REST API endpoints and responses.",
        priority: "low",
        columnId: "todo",
        tags: ["documentation"],
      },
      {
        title: "Implement Search",
        description: "Add debounced task search functionality.",
        priority: "high",
        columnId: "todo",
        tags: ["frontend", "feature"],
      },

      // IN PROGRESS
      {
        title: "Build Task CRUD APIs",
        description: "Implement task creation and editing endpoints.",
        priority: "high",
        columnId: "inprogress",
        tags: ["backend", "api"],
      },
      {
        title: "Configure MongoDB Atlas",
        description: "Set up cloud database and indexes.",
        priority: "medium",
        columnId: "inprogress",
        tags: ["database", "cloud"],
      },
      {
        title: "Implement Dark Mode",
        description: "Build persistent light and dark themes.",
        priority: "low",
        columnId: "inprogress",
        tags: ["frontend", "ui"],
      },

      // DONE
      {
        title: "Initialize MERN Project",
        description: "Set up React, Vite and Express.",
        priority: "low",
        columnId: "done",
        tags: ["setup"],
      },
      {
        title: "Create Database Schema",
        description: "Define Board and Task Mongoose models.",
        priority: "medium",
        columnId: "done",
        tags: ["database", "backend"],
      },
      {
        title: "Configure Git Workflow",
        description: "Initialize repository and feature branches.",
        priority: "high",
        columnId: "done",
        tags: ["git", "setup"],
      },
    ];

    // Assign sequential positions within each column
    const tasksToInsert = sampleTasks.map((task) => ({
      ...task,
      boardId: board._id,
      orderIndex: 0,
    }));

    const counters = {
      todo: 0,
      inprogress: 0,
      done: 0,
    };

    for (const task of tasksToInsert) {
      task.orderIndex = counters[task.columnId]++;
    }

    await Task.insertMany(tasksToInsert);

    console.log("--------------------------------");
    console.log("TaskFlow database seeded successfully!");
    console.log(`Board ID: ${board._id}`);
    console.log(`Total tasks: ${tasksToInsert.length}`);
    console.log(`To Do: ${counters.todo}`);
    console.log(`In Progress: ${counters.inprogress}`);
    console.log(`Done: ${counters.done}`);
    console.log("--------------------------------");

  } catch (error) {
    console.error("Database seeding failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seedDatabase();
