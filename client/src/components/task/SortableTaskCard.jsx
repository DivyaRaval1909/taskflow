
import { useDndContext } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import TaskCard from "./TaskCard";

function SortableTaskCard({ task, onEdit, onDelete, isLast }) {
  const { active, over } = useDndContext();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id: task._id });

  const activeRect = active?.rect.current.translated;
  const dropAfterLast =
    isLast &&
    isOver &&
    active?.id !== task._id &&
    activeRect &&
    over?.rect &&
    activeRect.top + activeRect.height / 2 >=
      over.rect.top + over.rect.height / 2;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: "relative",
    zIndex: isDragging ? 10 : "auto",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`sortable-task-wrapper ${
        isOver && !isDragging
          ? `task-drop-target ${dropAfterLast ? "task-drop-after" : ""}`
          : ""
      }`}
    >
      <TaskCard
        task={task}
        onEdit={onEdit}
        onDelete={onDelete}
        dragAttributes={attributes}
        dragListeners={listeners}
      />
    </div>
  );
}

export default SortableTaskCard;
