import Dropdown from "react-bootstrap/Dropdown";
import { MoreVertical } from "lucide-react";

export default function RowActionsMenu({ label = "Actions", children }) {
  return (
    <Dropdown align="end">
      <Dropdown.Toggle as="button" className="ab-row-actions-toggle" aria-label={label}>
        <MoreVertical size={16} />
      </Dropdown.Toggle>
      <Dropdown.Menu>{children}</Dropdown.Menu>
    </Dropdown>
  );
}
