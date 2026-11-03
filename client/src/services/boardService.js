
import api from "./api";

const boardService = {
  // Fetch all boards
  getBoards: async () => {
    const response = await api.get("/boards");
    return response.data;
  },

  // Fetch a specific board
  getBoard: async (boardId) => {
    const response = await api.get(`/boards/${boardId}`);
    return response.data;
  },

  // Create a board
  createBoard: async (name) => {
    const response = await api.post("/boards", { name });
    return response.data;
  },
};

export default boardService;
