
const mongoose = require("mongoose");
const Board = require("../models/Board");

// Create a board
const createBoard = async (req, res) => {
  const { name } = req.body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({
      success: false,
      message: "Board name is required",
    });
  }

  const board = await Board.create({
    name: name.trim(),
  });

  res.status(201).json({
    success: true,
    message: "Board created successfully",
    data: board,
  });
};

// Get all boards
const getBoards = async (req, res) => {
  const boards = await Board.find()
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({
    success: true,
    count: boards.length,
    data: boards,
  });
};

// Get one board
const getBoardById = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid board ID",
    });
  }

  const board = await Board.findById(id).lean();

  if (!board) {
    return res.status(404).json({
      success: false,
      message: "Board not found",
    });
  }

  res.status(200).json({
    success: true,
    data: board,
  });
};

module.exports = {
  createBoard,
  getBoards,
  getBoardById,
};
