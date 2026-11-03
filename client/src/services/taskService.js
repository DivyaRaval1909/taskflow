
import api from "./api";

const taskService = {
  getTasks: async (boardId) => {
    const response = await api.get("/tasks", {
      params: { boardId },
    });

    return response.data;
  },

  createTask: async (taskData, expectedRevision) => {
    const response = await api.post("/tasks", {
      ...taskData,
      expectedRevision,
    });

    return response.data;
  },

  updateTask: async (taskId, boardId, updates, expectedRevision) => {
    const response = await api.patch(
      `/tasks/${taskId}`,
      {
        ...updates,
        expectedRevision,
      },
      {
        params: { boardId },
      }
    );

    return response.data;
  },

  deleteTask: async (taskId, boardId, expectedRevision) => {
    const response = await api.delete(`/tasks/${taskId}`, {
      params: { boardId, expectedRevision },
    });

    return response.data;
  },

  moveTask: async (taskId, moveData) => {
    const response = await api.patch(
      `/tasks/${taskId}/move`,
      moveData
    );

    return response.data;
  },
};

export default taskService;
