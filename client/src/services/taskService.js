
import api from "./api";

const taskService = {
  // Fetch all tasks belonging to a board
  getTasks: async (boardId) => {
    const response = await api.get("/tasks", {
      params: { boardId },
    });

    return response.data;
  },

  // Create a new task
  createTask: async (taskData) => {
    const response = await api.post("/tasks", taskData);

    return response.data;
  },

  // Update task details
  updateTask: async (taskId, boardId, updates) => {
    const response = await api.patch(
      `/tasks/${taskId}`,
      updates,
      { params: { boardId } }
    );

    return response.data;
  },

  // Delete task
  deleteTask: async (taskId, boardId) => {
    const response = await api.delete(
      `/tasks/${taskId}`,
      { params: { boardId } }
    );

    return response.data;
  },

  // Move or reorder task
  moveTask: async (taskId, moveData) => {
    const response = await api.patch(
      `/tasks/${taskId}/move`,
      moveData
    );

    return response.data;
  },
};

export default taskService;
