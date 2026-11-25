import TasksPanel from "../admin/TasksPanel"; // adjust path to where TasksPanel lives
import type { Viewer } from "../admin/Modal/Ui"; // adjust path

/**
 * Staff view: only the tasks assigned to this person.
 * They can add their own tasks, Start work, Pause, Resume and Complete;
 * completing sends it for approval (the person who assigned it, or the
 * operation manager for tasks they added themselves, and the admin).
 */
const AssignedWork = ({ viewer }: { viewer: Viewer }) => (
  <div className="space-y-5">
    <div>
      <h2 className="text-2xl font-bold">Assigned work</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Add your own tasks, start the timer when you begin, pause when you stop, and complete to
        send it for approval.
      </p>
    </div>

    <TasksPanel viewer={viewer} scope="own" canAddOwn />
  </div>
);

export default AssignedWork;