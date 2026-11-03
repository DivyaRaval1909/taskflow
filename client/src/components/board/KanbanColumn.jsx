
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

import SortableTaskCard from "../task/SortableTaskCard";

function KanbanColumn({
  column,
  tasks,
  onEdit,
  onDelete,
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      columnId: column.id,
      type: "column",
    },
  });

  return (
    <div
      className={`kanban-column ${isOver ? "column-drag-over" : ""}`}
      ref={setNodeRef}
    >
      <div className="column-header">
        <h2>{column.title}</h2>
        <span className="task-count">{tasks.length}</span>
      </div>

      <SortableContext
        items={tasks.map((task) => task._id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="column-content">
          {tasks.length === 0 ? (
            <p className="empty-column">
              Drop a task here
            </p>
          ) : (
            tasks.map((task, index) => (
              <SortableTaskCard
                key={task._id}
                task={task}
                onEdit={onEdit}
                onDelete={onDelete}
                isLast={index === tasks.length - 1}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export default KanbanColumn;
