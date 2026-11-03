
import { useEffect, useMemo, useState } from "react";
import { Plus, Sun, Moon } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import toast from "react-hot-toast";

import useBoardStore from "../../store/boardStore";
import useDebounce from "../../hooks/useDebounce";
import TaskForm from "../task/TaskForm";
import KanbanColumn from "./KanbanColumn";
import BoardFilters from "./BoardFilters";

const COLUMNS = [
  { id: "todo", title: "To Do" },
  { id: "inprogress", title: "In Progress" },
  { id: "done", title: "Done" },
];

function Board() {
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const [editingTask, setEditingTask] = useState(null);

  const [search, setSearch] = useState("");
  const [selectedPriorities, setSelectedPriorities] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [theme, setTheme] = useState(
  () => localStorage.getItem("taskflow-theme") || "light"
);

useEffect(() => {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("taskflow-theme", theme);
}, [theme]);

const toggleTheme = () => {
  setTheme((current) => (current === "light" ? "dark" : "light"));
};

  const debouncedSearch = useDebounce(search, 300);

  const board = useBoardStore((state) => state.board);
  const tasks = useBoardStore((state) => state.tasks);
  const isLoading = useBoardStore((state) => state.isLoading);
  const error = useBoardStore((state) => state.error);

  const loadBoard = useBoardStore((state) => state.loadBoard);
  const createTask = useBoardStore((state) => state.createTask);
  const updateTask = useBoardStore((state) => state.updateTask);
  const deleteTask = useBoardStore((state) => state.deleteTask);
  const moveTask = useBoardStore((state) => state.moveTask);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load the first available board.
  useEffect(() => {
    const fetchBoard = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/boards`
        );

        if (!response.ok) {
          throw new Error("Unable to fetch boards");
        }

        const result = await response.json();

        if (!result.data?.length) {
          throw new Error("No board found. Run the seed script.");
        }

        await loadBoard(result.data[0]._id);
      } catch (err) {
        toast.error(err.message || "Failed to load workspace");
      }
    };

    fetchBoard();
  }, [loadBoard]);

  // Multi-filter selection helpers.
  const togglePriority = (priority) => {
    setSelectedPriorities((previous) =>
      previous.includes(priority)
        ? previous.filter((item) => item !== priority)
        : [...previous, priority]
    );
  };

  const toggleColumn = (columnId) => {
    setSelectedColumns((previous) =>
      previous.includes(columnId)
        ? previous.filter((item) => item !== columnId)
        : [...previous, columnId]
    );
  };

  const clearFilters = () => {
    setSearch("");
    setSelectedPriorities([]);
    setSelectedColumns([]);
  };

  // Apply filters to the original tasks without modifying their orderIndex.
  const filteredTasks = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesSearch =
        !query ||
        task.title.toLowerCase().includes(query) ||
        (task.description || "").toLowerCase().includes(query);

      const matchesPriority =
        selectedPriorities.length === 0 ||
        selectedPriorities.includes(task.priority);

      const matchesColumn =
        selectedColumns.length === 0 ||
        selectedColumns.includes(task.columnId);

      return matchesSearch && matchesPriority && matchesColumn;
    });
  }, [
    tasks,
    debouncedSearch,
    selectedPriorities,
    selectedColumns,
  ]);

  const handleCreateTask = async (taskData) => {
    try {
      await createTask(taskData);
      toast.success("Task created successfully");
    } catch (error) {
      toast.error(error.message || "Unable to create task");
      throw error;
    }
  };

  const handleUpdateTask = async (taskData) => {
    try {
      await updateTask(editingTask._id, taskData);
      toast.success("Task updated successfully");
      setEditingTask(null);
    } catch (error) {
      toast.error(error.message || "Unable to update task");
      throw error;
    }
  };

  const handleDeleteTask = async (task) => {
    if (
      !window.confirm(`Delete "${task.title}"?`)
    ) {
      return;
    }

    try {
      await deleteTask(task._id);
      toast.success("Task deleted successfully");
    } catch (error) {
      toast.error(error.message || "Unable to delete task");
    }
  };

  const handleDragEnd = async ({ active, over }) => {
    if (!over || over.id === active.id) return;

    const activeTask = tasks.find(
      (task) => task._id === active.id
    );

    if (!activeTask) return;

    const overTask = tasks.find(
      (task) => task._id === over.id
    );

    const targetColumnId = overTask
      ? overTask.columnId
      : COLUMNS.find((column) => column.id === over.id)?.id;

    if (!targetColumnId) return;

    // Calculate the destination using the complete, unfiltered
    // column so hidden tasks do not cause incorrect positions.
    const destinationTasks = tasks
      .filter(
        (task) =>
          task.columnId === targetColumnId &&
          task._id !== activeTask._id
      )
      .sort((a, b) => a.orderIndex - b.orderIndex);

    let destinationIndex = destinationTasks.length;

    if (overTask) {
      const targetIndex = destinationTasks.findIndex(
        (task) => task._id === overTask._id
      );
      const visibleTargetTasks = filteredTasks
        .filter((task) => task.columnId === targetColumnId)
        .sort((a, b) => a.orderIndex - b.orderIndex);
      const draggedRect = active.rect.current.translated;
      const isDropAfterLast =
        visibleTargetTasks.at(-1)?._id === overTask._id &&
        draggedRect &&
        over.rect &&
        draggedRect.top + draggedRect.height / 2 >=
          over.rect.top + over.rect.height / 2;

      destinationIndex =
        targetIndex < 0
          ? destinationTasks.length
          : targetIndex + (isDropAfterLast ? 1 : 0);
    }

    // No-op if the task is already at the requested position.
    if (
      activeTask.columnId === targetColumnId &&
      activeTask.orderIndex === destinationIndex
    ) {
      return;
    }

    try {
      await moveTask(
        activeTask._id,
        targetColumnId,
        destinationIndex
      );
    } catch (error) {
      toast.error(error.message || "Unable to move task");
    }
  };

  if (isLoading) {
    return (
      <div className="board-message">
        Loading your workspace...
      </div>
    );
  }

  if (error && !board) {
    return <div className="board-message error">{error}</div>;
  }

  if (!board) {
    return (
      <div className="board-message">
        Preparing your workspace...
      </div>
    );
  }

  return (
    <main className="board-container">
      <header className="board-header">
        <div>
          <p className="board-eyebrow">WORKSPACE</p>
          <h1>{board.name}</h1>
          <p className="board-subtitle">
            Organize your work and keep things moving.
          </p>
        </div>

        <div className="board-header-actions">
  <span className="board-stats">
    {filteredTasks.length} tasks
  </span>

  <button
    className="theme-toggle"
    onClick={toggleTheme}
    aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
  >
    {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
  </button>

  <button
    className="button-primary create-task-button"
    onClick={() => setIsTaskModalOpen(true)}
  >
    <Plus size={17} />
    Add task
  </button>
</div>
      </header>

      <BoardFilters
        search={search}
        onSearchChange={setSearch}
        selectedPriorities={selectedPriorities}
        onPriorityChange={togglePriority}
        selectedColumns={selectedColumns}
        onColumnChange={toggleColumn}
        onClear={clearFilters}
      />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
      >
        <section className="kanban-grid">
          {COLUMNS.map((column) => {
            const columnTasks = filteredTasks
              .filter((task) => task.columnId === column.id)
              .sort((a, b) => a.orderIndex - b.orderIndex);

            return (
              <KanbanColumn
                key={column.id}
                column={column}
                tasks={columnTasks}
                onEdit={setEditingTask}
                onDelete={handleDeleteTask}
              />
            );
          })}
        </section>
      </DndContext>

      {isTaskModalOpen && (
        <TaskForm
          onClose={() => setIsTaskModalOpen(false)}
          onSubmit={handleCreateTask}
        />
      )}

      {editingTask && (
        <TaskForm
          key={editingTask._id}
          initialTask={editingTask}
          onClose={() => setEditingTask(null)}
          onSubmit={handleUpdateTask}
        />
      )}
    </main>
  );
}

export default Board;
