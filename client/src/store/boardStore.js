
import { create } from "zustand";
import boardService from "../services/boardService";
import taskService from "../services/taskService";

const useBoardStore = create((set) => ({
  // Application state
  board: null,
  tasks: [],
  isLoading: false,
  error: null,

  // Load a board and its tasks from the backend
  loadBoard: async (boardId) => {
    set({ isLoading: true, error: null });

    try {
      const [boardResponse, taskResponse] = await Promise.all([
        boardService.getBoard(boardId),
        taskService.getTasks(boardId),
      ]);

      set({
        board: boardResponse.data,
        tasks: taskResponse.data,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to load board";

      set({
        isLoading: false,
        error: message,
      });
    }
  },

  // Reset board state
  resetBoard: () => {
    set({
      board: null,
      tasks: [],
      isLoading: false,
      error: null,
    });
  },
}));

export default useBoardStore;
