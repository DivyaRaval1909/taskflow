
import { Pencil, Trash2, GripVertical } from "lucide-react";

function TaskCard({
  task,
  onEdit,
  onDelete,
  dragAttributes,
  dragListeners,
}) {
  return (
    <article className="task-card">
      <div className="task-card-top">
        <span className={`priority priority-${task.priority}`}>
          {task.priority}
        </span>

        <div className="task-actions">
          <button
            type="button"
            className="task-action-button drag-handle"
            {...dragAttributes}
            {...dragListeners}
            aria-label={`Drag ${task.title}`}
            title="Drag to move task"
          >
            <GripVertical size={16} />
          </button>

          <button
            type="button"
            className="task-action-button"
            onClick={() => onEdit(task)}
            aria-label={`Edit ${task.title}`}
            title="Edit task"
          >
            <Pencil size={15} />
          </button>

          <button
            type="button"
            className="task-action-button delete-action"
            onClick={() => onDelete(task)}
            aria-label={`Delete ${task.title}`}
            title="Delete task"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <h3>{task.title}</h3>

      {task.description && <p>{task.description}</p>}

      {task.tags?.length > 0 && (
        <div className="task-tags">
          {task.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      )}
    </article>
  );
}

export default TaskCard;
