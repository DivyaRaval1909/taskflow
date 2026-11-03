
import { create } from "zustand";
import boardService from "../services/boardService";
import taskService from "../services/taskService";
import {
  enqueueMutation,
  resetMutationQueue,
} from "./mutationQueue";

// Last state confirmed by the backend.
let confirmedState = {
  board: null,
  tasks: [],
};

// Optimistic operations waiting for server confirmation.
let pendingOperations = [];

let loadRequestId = 0;
let boardGeneration = 0;
let nextOperationId = 1;

const rebuildVisibleState = () => {
  let visible = {
    board: confirmedState.board,
    tasks: [...confirmedState.tasks],
  };

  // Replay pending operations over confirmed server data.
  for (const operation of pendingOperations) {
    visible = operation.reducer(visible);
  }

  useBoardStore.setState({
    board: visible.board,
    tasks: visible.tasks,
    isMutating: pendingOperations.length > 0,
  });
};

// Fetch the latest server state after a revision conflict.
const refreshConfirmedState = async (boardId) => {
  const [boardResponse, taskResponse] = await Promise.all([
    boardService.getBoard(boardId),
    taskService.getTasks(boardId),
  ]);

  confirmedState = {
    board: boardResponse.data,
    tasks: taskResponse.data,
  };
};

// Shared optimistic mutation executor.
const executeOptimisticMutation = ({
  optimisticReducer,
  apiOperation,
  successReducer,
}) => {
  const currentState = useBoardStore.getState();

  if (!currentState.board) {
    return Promise.reject(
      new Error("No board is currently selected")
    );
  }

  const boardId = currentState.board._id;
  const generation = boardGeneration;
  const operationId = nextOperationId++;

  // Immediately apply the optimistic operation.
  pendingOperations.push({
    id: operationId,
    reducer: optimisticReducer,
  });

  rebuildVisibleState();

  return enqueueMutation(async () => {
    try {
      if (generation !== boardGeneration) {
        throw new Error("Board selection changed");
      }

      if (!confirmedState.board) {
        throw new Error("Board is not loaded");
      }

      if (confirmedState.board._id !== boardId) {
        throw new Error("Board selection changed");
      }

      // Always use the latest confirmed revision.
      const expectedRevision = confirmedState.board.revision;

      const result = await apiOperation(expectedRevision);

      if (generation !== boardGeneration) {
        throw new Error("Board selection changed");
      }

      // Update confirmed state using the server response.
      confirmedState = successReducer(confirmedState, result);

      return result;
    } catch (error) {
      // Recover from stale revision conflicts.
      if (
        generation === boardGeneration &&
        error.response?.status === 409
      ) {
        try {
          await refreshConfirmedState(boardId);
        } catch (refreshError) {
          console.error(
            "Board refresh failed:",
            refreshError
          );
        }
      }

      throw error;
    } finally {
      if (generation === boardGeneration) {
        // Remove only the completed operation.
        pendingOperations = pendingOperations.filter(
          (operation) => operation.id !== operationId
        );

        // Rebuild the UI with remaining pending operations.
        rebuildVisibleState();
      }
    }
  }).then((result) => {
    if (generation === boardGeneration) {
      useBoardStore.setState({ error: null });
    }

    return result;
  }).catch((error) => {
    if (generation === boardGeneration) {
      useBoardStore.setState({
        error:
          error.response?.data?.message ||
          error.message ||
          "Task operation failed",
      });
    }

    throw error;
  });
};

const useBoardStore = create((set, get) => ({
  board: null,
  tasks: [],
  isLoading: false,
  isMutating: false,
  error: null,

  // Load a board and its tasks.
  loadBoard: async (boardId) => {
    const requestId = ++loadRequestId;

    set({
      isLoading: true,
      error: null,
    });

    try {
      const [boardResponse, taskResponse] = await Promise.all([
        boardService.getBoard(boardId),
        taskService.getTasks(boardId),
      ]);

      if (requestId !== loadRequestId) return;

      boardGeneration++;
      pendingOperations = [];

      confirmedState = {
        board: boardResponse.data,
        tasks: taskResponse.data,
      };

      set({
        board: confirmedState.board,
        tasks: confirmedState.tasks,
        isLoading: false,
        isMutating: false,
        error: null,
      });
    } catch (error) {
      if (requestId !== loadRequestId) return;

      set({
        isLoading: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to load board",
      });
    }
  },

  // Reset the currently selected board.
  resetBoard: () => {
    loadRequestId++;
    boardGeneration++;
    pendingOperations = [];

    confirmedState = {
      board: null,
      tasks: [],
    };

    resetMutationQueue();

    set({
      board: null,
      tasks: [],
      isLoading: false,
      isMutating: false,
      error: null,
    });
  },

  // Create a task optimistically.
  createTask: async (taskData) => {
    const board = get().board;

    if (!board) {
      throw new Error("No board is currently selected");
    }

    const columnId = taskData.columnId || "todo";

    const columnTasks = get().tasks.filter(
      (task) => task.columnId === columnId
    );

    const orderIndex = columnTasks.length;

    // Temporary ID until MongoDB returns the actual task.
    const temporaryId = `optimistic-${nextOperationId++}`;

    const optimisticTask = {
      _id: temporaryId,
      ...taskData,
      boardId: board._id,
      title: taskData.title.trim(),
      description: taskData.description || "",
      priority: taskData.priority || "medium",
      columnId,
      orderIndex,
      tags: taskData.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isOptimistic: true,
    };

    return executeOptimisticMutation({
      optimisticReducer: (state) => ({
        ...state,
        tasks: [...state.tasks, optimisticTask],
      }),

      apiOperation: (expectedRevision) =>
        taskService.createTask(
          {
            ...taskData,
            boardId: board._id,
            columnId,
          },
          expectedRevision
        ),

      successReducer: (state, result) => ({
        board: {
          ...state.board,
          revision: result.revision,
        },
        tasks: [...state.tasks, result.data],
      }),
    });
  },

  // Update a task optimistically.
  updateTask: async (taskId, updates) => {
    const board = get().board;

    if (!board) {
      throw new Error("No board is currently selected");
    }

    const existingTask = get().tasks.find(
      (task) => task._id === taskId
    );

    if (!existingTask) {
      throw new Error("Task not found");
    }

    return executeOptimisticMutation({
      optimisticReducer: (state) => ({
        ...state,
        tasks: state.tasks.map((task) =>
          task._id === taskId
            ? {
                ...task,
                ...updates,
                updatedAt: new Date().toISOString(),
              }
            : task
        ),
      }),

      apiOperation: (expectedRevision) =>
        taskService.updateTask(
          taskId,
          board._id,
          updates,
          expectedRevision
        ),

      successReducer: (state, result) => ({
        board: {
          ...state.board,
          revision: result.revision,
        },
        tasks: state.tasks.map((task) =>
          task._id === taskId ? result.data : task
        ),
      }),
    });
  },

  // Delete a task optimistically.
  deleteTask: async (taskId) => {
    const board = get().board;

    if (!board) {
      throw new Error("No board is currently selected");
    }

    const existingTask = get().tasks.find(
      (task) => task._id === taskId
    );

    if (!existingTask) {
      throw new Error("Task not found");
    }

    return executeOptimisticMutation({
      optimisticReducer: (state) => ({
        ...state,
        tasks: state.tasks
          .filter((task) => task._id !== taskId)
          .map((task) => {
            if (task.columnId !== existingTask.columnId) {
              return task;
            }

            if (task.orderIndex > existingTask.orderIndex) {
              return {
                ...task,
                orderIndex: task.orderIndex - 1,
              };
            }

            return task;
          }),
      }),

      apiOperation: (expectedRevision) =>
        taskService.deleteTask(
          taskId,
          board._id,
          expectedRevision
        ),

      successReducer: (state, result) => ({
        board: {
          ...state.board,
          revision: result.revision,
        },
        tasks: state.tasks.filter(
          (task) => task._id !== taskId
        ),
      }),
    });
  },

  // Move a task between columns or reorder within a column.
  moveTask: async (taskId, targetColumnId, destinationIndex) => {
    const board = get().board;

    if (!board) {
      throw new Error("No board is currently selected");
    }

    const task = get().tasks.find(
      (item) => item._id === taskId
    );

    if (!task) {
      throw new Error("Task not found");
    }

    const validColumns = ["todo", "inprogress", "done"];

    if (!validColumns.includes(targetColumnId)) {
      throw new Error("Invalid destination column");
    }

    if (
      !Number.isInteger(destinationIndex) ||
      destinationIndex < 0
    ) {
      throw new Error("Invalid destination position");
    }

    // This reducer is replayed whenever pending operations change.
    const optimisticReducer = (state) => {
      const movingTask = state.tasks.find(
        (item) => item._id === taskId
      );

      if (!movingTask) {
        return state;
      }

      // Determine source from the current replayed state.
      const sourceColumnId = movingTask.columnId;

      const sourceTasks = state.tasks
        .filter(
          (item) =>
            item.columnId === sourceColumnId &&
            item._id !== taskId
        )
        .sort((a, b) => a.orderIndex - b.orderIndex);

      const destinationTasks =
        sourceColumnId === targetColumnId
          ? sourceTasks
          : state.tasks
              .filter(
                (item) => item.columnId === targetColumnId
              )
              .sort((a, b) => a.orderIndex - b.orderIndex);

      const safeIndex = Math.min(
        destinationIndex,
        destinationTasks.length
      );

      destinationTasks.splice(safeIndex, 0, {
        ...movingTask,
        columnId: targetColumnId,
      });

      const unaffectedTasks = state.tasks.filter(
        (item) =>
          item.columnId !== sourceColumnId &&
          item.columnId !== targetColumnId
      );

      const normalizedSource = (
        sourceColumnId === targetColumnId
          ? destinationTasks
          : sourceTasks
      ).map((item, index) => ({
        ...item,
        columnId: sourceColumnId,
        orderIndex: index,
      }));

      const normalizedDestination =
        sourceColumnId === targetColumnId
          ? []
          : destinationTasks.map((item, index) => ({
              ...item,
              columnId: targetColumnId,
              orderIndex: index,
            }));

      return {
        ...state,
        tasks: [
          ...unaffectedTasks,
          ...normalizedSource,
          ...normalizedDestination,
        ],
      };
    };

    return executeOptimisticMutation({
      optimisticReducer,

      apiOperation: (expectedRevision) => {
        const confirmedTask = confirmedState.tasks.find(
          (item) => item._id === taskId
        );

        if (!confirmedTask) {
          throw new Error(
            "Task no longer exists on the server"
          );
        }

        return taskService.moveTask(taskId, {
          boardId: board._id,
          targetColumnId,
          destinationIndex,
          expectedRevision,
        });
      },

      successReducer: (state, result) => {
        const moveResult = result.data;

        // Use explicit affected columns. This also handles
        // a source column that becomes completely empty.
        const affectedColumns = new Set(
          moveResult.affectedColumnIds
        );

        return {
          board: {
            ...state.board,
            revision: moveResult.revision,
          },
          tasks: [
            ...state.tasks.filter(
              (item) => !affectedColumns.has(item.columnId)
            ),
            ...moveResult.tasks,
          ],
        };
      },
    });
  },

  // Exposed for controlled use and debugging.
  executeOptimisticMutation,
}));

export default useBoardStore;
