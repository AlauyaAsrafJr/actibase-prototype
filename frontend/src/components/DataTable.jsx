import Table from "react-bootstrap/Table";
import { EmptyState } from "./Feedback";

export default function DataTable({ columns, rows, rowKey = "id", emptyMessage = "Nothing here yet." }) {
  if (!rows || rows.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <div className="table-responsive bg-white border rounded">
      <Table hover className="mb-0 align-middle">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="text-uppercase small text-muted" style={{ fontSize: "0.72rem", letterSpacing: "0.04em" }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[rowKey]}>
              {columns.map((col) => (
                <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
